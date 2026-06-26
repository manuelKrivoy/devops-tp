const http = require("node:http");
const https = require("node:https");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

loadEnvFile(path.resolve(__dirname, "..", ".env"));

const API_URL = process.env.API_URL || "https://book-library-api-latest.onrender.com";
const REQUESTS_PER_MINUTE = parsePositiveInteger(process.env.REQUESTS_PER_MINUTE, 10);
const TOTAL_REQUESTS = parsePositiveInteger(process.env.TOTAL_REQUESTS, 20);
const REQUEST_TIMEOUT_MS = parsePositiveInteger(process.env.REQUEST_TIMEOUT_MS, 10000);

const baseUrl = new URL(API_URL);
const transport = baseUrl.protocol === "https:" ? https : http;
const intervalMs = Math.ceil(60000 / REQUESTS_PER_MINUTE);

const state = {
  token: null,
  bookId: null,
  runId: randomUUID(),
};

const scenarios = [
  { name: "root", method: "GET", path: "/" },
  { name: "health", method: "GET", path: "/api/health" },
  { name: "books-list", method: "GET", path: "/api/books" },
  { name: "not-found", method: "GET", path: "/api/no-existe" },
  { name: "missing-auth", method: "POST", path: "/api/books", body: { title: "Sentry Test", author: "Script" } },
  { name: "redirect", method: "GET", path: "/api/traffic/redirect" },
  { name: "simulated-error", method: "GET", path: "/api/traffic/error" },
  {
    name: "external-book",
    method: "GET",
    path: "/api/traffic/external-book?title=The%20Hobbit",
  },
  {
    name: "register",
    method: "POST",
    path: "/api/auth/register",
    buildBody: () => ({
      name: "Sentry Traffic",
      email: `sentry-traffic-${state.runId}@example.com`,
      password: "password123",
    }),
    after: (payload) => {
      state.token = payload.token || state.token;
    },
  },
  {
    name: "login",
    method: "POST",
    path: "/api/auth/login",
    buildBody: () => ({
      email: `sentry-traffic-${state.runId}@example.com`,
      password: "password123",
    }),
    after: (payload) => {
      state.token = payload.token || state.token;
    },
  },
  {
    name: "create-book",
    method: "POST",
    path: "/api/books",
    headers: () => (state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    body: { title: "Observability in Practice", author: "Sentry Traffic", year: 2026 },
    after: (payload) => {
      state.bookId = payload.id || state.bookId;
    },
  },
];

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request({ method, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const requestUrl = new URL(path, baseUrl);
    const req = transport.request(
      requestUrl,
      {
        method,
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
          "User-Agent": "book-library-api-traffic-script/1.0",
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(headers || {}),
        },
      },
      (res) => {
        let responseBody = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: responseBody });
        });
      },
    );

    req.on("timeout", () => req.destroy(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`)));
    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function runScenario(index) {
  const scenario = scenarios[index % scenarios.length];
  const headers = typeof scenario.headers === "function" ? scenario.headers() : scenario.headers;
  const body = typeof scenario.buildBody === "function" ? scenario.buildBody() : scenario.body;
  const response = await request({ method: scenario.method, path: scenario.path, headers, body });
  let payload = null;

  try {
    payload = response.body ? JSON.parse(response.body) : null;
  } catch {
    payload = null;
  }

  if (typeof scenario.after === "function" && payload) {
    scenario.after(payload);
  }

  console.log(`${index + 1}/${TOTAL_REQUESTS} ${scenario.method} ${scenario.path} -> ${response.statusCode} (${scenario.name})`);
}

async function main() {
  console.log(`API_URL=${API_URL}`);
  console.log(`TOTAL_REQUESTS=${TOTAL_REQUESTS}`);
  console.log(`REQUESTS_PER_MINUTE=${REQUESTS_PER_MINUTE}`);

  for (let index = 0; index < TOTAL_REQUESTS; index += 1) {
    if (index > 0) {
      await wait(intervalMs);
    }

    try {
      await runScenario(index);
    } catch (error) {
      console.error(`${index + 1}/${TOTAL_REQUESTS} request failed: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
