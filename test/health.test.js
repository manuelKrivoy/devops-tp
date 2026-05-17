const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const app = require("../src/index");

function listen(appInstance) {
  return new Promise((resolve, reject) => {
    const server = appInstance.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function request(server, path) {
  return makeRequest(server, {
    path,
    method: "GET",
  });
}

function makeRequest(server, { path, method = "GET", headers = {}, body } ) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();

    const payload = body ? JSON.stringify(body) : null;
    const requestHeaders = { ...headers };

    if (payload && !requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (payload) {
      requestHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: requestHeaders,
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body, headers: res.headers });
        });
      },
    );

    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function registerUser(server, suffix) {
  const response = await makeRequest(server, {
    path: "/api/auth/register",
    method: "POST",
    body: {
      name: `User ${suffix}`,
      email: `user-${suffix}@example.com`,
      password: "password123",
    },
  });

  assert.equal(response.statusCode, 201);
  return JSON.parse(response.body);
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

test("GET /api/traffic/error returns 500", async () => {
  const server = await listen(app);

  try {
    const response = await request(server, "/api/traffic/error");
    assert.equal(response.statusCode, 500);
    assert.equal(JSON.parse(response.body).error, "Error interno del servidor");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("rejects malformed login payloads with 400", async () => {
  const server = await listen(app);

  try {
    const response = await makeRequest(server, {
      path: "/api/auth/login",
      method: "POST",
      body: {
        email: 123,
        password: "password123",
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "Email o contraseña inválidos");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("registers, logs in and enforces book ownership", async () => {
  const server = await listen(app);

  try {
    const ownerId = randomUUID();
    const otherId = randomUUID();
    const owner = await registerUser(server, ownerId);
    const other = await registerUser(server, otherId);

    const createResponse = await makeRequest(server, {
      path: "/api/books",
      method: "POST",
      headers: {
        Authorization: `Bearer ${owner.token}`,
      },
      body: {
        title: "Domain-Driven Design",
        author: "Eric Evans",
        year: 0,
      },
    });

    assert.equal(createResponse.statusCode, 201);
    const createdBook = JSON.parse(createResponse.body);
    assert.equal(createdBook.year, 0);
    assert.equal(createdBook.createdBy, owner.user.id);

    const getResponse = await request(server, `/api/books/${createdBook.id}`);
    assert.equal(getResponse.statusCode, 200);

    const forbiddenUpdate = await makeRequest(server, {
      path: `/api/books/${createdBook.id}`,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${other.token}`,
      },
      body: {
        title: "Changed by another user",
      },
    });

    assert.equal(forbiddenUpdate.statusCode, 403);

    const ownerUpdate = await makeRequest(server, {
      path: `/api/books/${createdBook.id}`,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${owner.token}`,
      },
      body: {
        title: "DDD",
      },
    });

    assert.equal(ownerUpdate.statusCode, 200);
    assert.equal(JSON.parse(ownerUpdate.body).title, "DDD");

    const deleteResponse = await makeRequest(server, {
      path: `/api/books/${createdBook.id}`,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${owner.token}`,
      },
    });

    assert.equal(deleteResponse.statusCode, 204);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
