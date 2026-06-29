require("./config/instrument");

const { randomUUID } = require("node:crypto");
const https = require("node:https");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const Sentry = require("@sentry/node");
const config = require("./config");
const openApiDocument = require("./swagger");
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");

const SENSITIVE_FIELDS = new Set(["password", "token", "authorization", "jwt", "secret"]);

function sanitizeForMonitoring(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForMonitoring);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_FIELDS.has(key.toLowerCase()) ? "[Filtered]" : sanitizeForMonitoring(item),
    ]),
  );
}

function getRequestPath(req) {
  return req.route && req.route.path ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
}

function getOutcome(statusCode) {
  if (statusCode >= 500) return "server_error";
  if (statusCode >= 400) return "client_error";
  if (statusCode >= 300) return "redirect";
  return "success";
}

function getSentryLevel(outcome) {
  if (outcome === "server_error") return "error";
  if (outcome === "client_error" || outcome === "redirect") return "warning";
  return "info";
}

function setHttpMonitoringScope(scope, req, res, startedAt) {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  const outcome = getOutcome(res.statusCode);
  const route = getRequestPath(req);

  scope.setLevel(getSentryLevel(outcome));
  scope.setTag("layer", "express");
  scope.setTag("http.method", req.method);
  scope.setTag("http.route", route);
  scope.setTag("http.status_code", String(res.statusCode));
  scope.setTag("http.outcome", outcome);
  scope.setContext("request", {
    id: req.monitoringId,
    method: req.method,
    url: req.originalUrl,
    route,
    params: sanitizeForMonitoring(req.params),
    query: sanitizeForMonitoring(req.query),
    body: sanitizeForMonitoring(req.body),
  });
  scope.setContext("response", {
    statusCode: res.statusCode,
    durationMs: Math.round(durationMs),
  });

  return { outcome, route, durationMs };
}

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

app.get("/api-docs.json", (_req, res) => {
  res.json(openApiDocument);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

// --- Seguridad ---
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  req.monitoringId = randomUUID();

  res.on("finish", () => {
    if (req.method === "HEAD") {
      return;
    }

    Sentry.withScope((scope) => {
      const { outcome, route, durationMs } = setHttpMonitoringScope(scope, req, res, startedAt);

      if (outcome === "server_error" && res.locals.sentryErrorCaptured) {
        return;
      }

      Sentry.captureMessage(
        `HTTP ${outcome}: ${req.method} ${route} -> ${res.statusCode} (${Math.round(durationMs)}ms)`,
        getSentryLevel(outcome),
      );
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
  res.json({ status: "API is running." });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/traffic/error", (_req, _res, next) => {
  next(new Error("Simulated Sentry traffic error"));
});
app.get("/api/traffic/redirect", (_req, res) => {
  res.redirect(302, "/api/health");
});
app.get("/api/traffic/external-book", async (req, res, next) => {
  const title = typeof req.query.title === "string" && req.query.title.trim() ? req.query.title.trim() : "The Hobbit";

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
  let eventId;

  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTag("layer", "express");
    scope.setTag("http.method", req.method);
    scope.setTag("http.status_code", "500");
    scope.setTag("http.outcome", "server_error");
    scope.setContext("request", {
      id: req.monitoringId,
      method: req.method,
      url: req.originalUrl,
      route: getRequestPath(req),
      params: sanitizeForMonitoring(req.params),
      query: sanitizeForMonitoring(req.query),
      body: sanitizeForMonitoring(req.body),
    });
    eventId = Sentry.captureException(err);
  });

  res.locals.sentryErrorCaptured = true;
  console.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    requestId: req.monitoringId,
    sentryEventId: eventId,
  });
  res.status(500).json({ error: "Error interno del servidor", requestId: req.monitoringId, sentryEventId: eventId });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Servidor corriendo en http://localhost:${config.port}`);
  });
}

module.exports = app;
