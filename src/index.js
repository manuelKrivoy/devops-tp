require("./config/instrument");

const https = require("node:https");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Sentry = require("@sentry/node");
const config = require("./config");
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "book-library-api/1.0",
        },
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`External API responded with status ${res.statusCode}`));
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("External API returned invalid JSON"));
          }
        });
      },
    );

    req.on("error", reject);
  });
}

const app = express();

// --- Seguridad ---
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setLevel("info");
      scope.setTag("layer", "express");
      scope.setTag("http.method", req.method);
      scope.setTag("http.status_code", String(res.statusCode));
      scope.setContext("request", {
        method: req.method,
        path: req.originalUrl,
        params: req.params,
        query: req.query,
      });
      scope.setContext("response", {
        statusCode: res.statusCode,
      });

      Sentry.captureMessage(`Successful HTTP response: ${req.method} ${req.originalUrl} ${res.statusCode}`);
    });
  });

  next();
});

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes, intentá de nuevo más tarde." },
});
app.use(limiter);

// --- Rutas ---
app.get("/", (_req, res) => {
  res.json({ status: "API Corriendo" });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/traffic/error", (_req, _res, next) => {
  next(new Error("Simulated Sentry traffic error"));
});
app.get("/api/traffic/external-book", async (req, res, next) => {
  const title = typeof req.query.title === "string" && req.query.title.trim()
    ? req.query.title.trim()
    : "The Hobbit";

  try {
    const payload = await getJson(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`);
    const match = payload.docs && payload.docs[0] ? payload.docs[0] : null;

    res.json({
      source: "openlibrary",
      query: title,
      found: Boolean(match),
      book: match
        ? {
            title: match.title || null,
            author: Array.isArray(match.author_name) ? match.author_name[0] || null : null,
            firstPublishedYear: match.first_publish_year || null,
            isbn: Array.isArray(match.isbn) ? match.isbn[0] || null : null,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Error handler global
app.use((err, req, res, _next) => {
  Sentry.withScope((scope) => {
    scope.setTag("layer", "express");
    scope.setContext("request", {
      method: req.method,
      path: req.originalUrl,
      params: req.params,
      query: req.query,
      body: req.body,
    });
    Sentry.captureException(err);
  });

  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Servidor corriendo en http://localhost:${config.port}`);
  });
}

module.exports = app;
