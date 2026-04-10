const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../src/index");

function listen(appInstance) {
  return new Promise((resolve, reject) => {
    const server = appInstance.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function request(server, path) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();

    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "GET",
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body });
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
}

test("GET /api/health returns ok", async () => {
  const server = await listen(app);

  try {
    const response = await request(server, "/api/health");
    assert.equal(response.statusCode, 200);

    const payload = JSON.parse(response.body);
    assert.equal(payload.status, "ok");
    assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
