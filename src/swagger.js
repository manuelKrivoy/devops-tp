const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Book Library API",
    version: "1.0.0",
    description: "API REST para gestion de libros con autenticacion JWT.",
  },
  servers: [
    {
      url: "/",
      description: "Servidor actual",
    },
  ],
  tags: [
    { name: "Health", description: "Estado de la API" },
    { name: "Auth", description: "Registro e inicio de sesion" },
    { name: "Books", description: "Gestion de libros" },
    { name: "Traffic", description: "Endpoints de prueba para monitoreo" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Ruta no encontrada" },
        },
      },
      Health: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string", example: "Juan Perez" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "name"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120, example: "Juan Perez" },
          email: { type: "string", format: "email", maxLength: 254, example: "juan@ejemplo.com" },
          password: { type: "string", minLength: 8, maxLength: 128, example: "miPassword123" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "juan@ejemplo.com" },
          password: { type: "string", example: "miPassword123" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Login exitoso" },
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
        },
      },
      Book: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", example: "Cien anos de soledad" },
          author: { type: "string", example: "Gabriel Garcia Marquez" },
          year: { type: "integer", nullable: true, example: 1967 },
          genre: { type: "string", nullable: true, example: "Realismo magico" },
          isbn: { type: "string", nullable: true, example: "978-0-06-088328-7" },
          createdBy: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      BookList: {
        type: "object",
        properties: {
          count: { type: "integer", example: 1 },
          books: {
            type: "array",
            items: { $ref: "#/components/schemas/Book" },
          },
        },
      },
      BookCreateRequest: {
        type: "object",
        required: ["title", "author"],
        properties: {
          title: { type: "string", maxLength: 500, example: "Cien anos de soledad" },
          author: { type: "string", maxLength: 300, example: "Gabriel Garcia Marquez" },
          year: { type: "integer", minimum: 0, example: 1967 },
          genre: { type: "string", example: "Realismo magico" },
          isbn: { type: "string", example: "978-0-06-088328-7" },
        },
      },
      BookUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 500, example: "Cien anos de soledad" },
          author: { type: "string", maxLength: 300, example: "Gabriel Garcia Marquez" },
          year: { type: "integer", minimum: 0, example: 1970 },
          genre: { type: "string", example: "Realismo magico" },
          isbn: { type: "string", example: "978-0-06-088328-7" },
        },
      },
      ExternalBookResponse: {
        type: "object",
        properties: {
          source: { type: "string", example: "openlibrary" },
          query: { type: "string", example: "The Hobbit" },
          found: { type: "boolean", example: true },
          book: {
            nullable: true,
            type: "object",
            properties: {
              title: { type: "string", nullable: true, example: "The Hobbit" },
              author: { type: "string", nullable: true, example: "J. R. R. Tolkien" },
              firstPublishedYear: { type: "integer", nullable: true, example: 1937 },
              isbn: { type: "string", nullable: true, example: "9780547928227" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["Health"],
        summary: "Estado basico de la API",
        responses: {
          200: {
            description: "API activa",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "API is running." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: {
            description: "Estado del servidor",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Health" } },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Registrar usuario",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } },
          },
        },
        responses: {
          201: {
            description: "Usuario registrado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          400: { description: "Datos invalidos", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Email ya registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesion",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } },
          },
        },
        responses: {
          200: {
            description: "Login exitoso",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          400: { description: "Datos invalidos", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Credenciales invalidas", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/books": {
      get: {
        tags: ["Books"],
        summary: "Listar libros",
        responses: {
          200: {
            description: "Listado de libros",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BookList" } },
            },
          },
        },
      },
      post: {
        tags: ["Books"],
        summary: "Crear libro",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/BookCreateRequest" } },
          },
        },
        responses: {
          201: { description: "Libro creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Book" } } } },
          400: { description: "Datos invalidos", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Token requerido o invalido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/books/{id}": {
      get: {
        tags: ["Books"],
        summary: "Obtener libro por ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Libro encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Book" } } } },
          404: { description: "Libro no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        tags: ["Books"],
        summary: "Actualizar libro",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/BookUpdateRequest" } },
          },
        },
        responses: {
          200: { description: "Libro actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Book" } } } },
          400: { description: "Datos invalidos", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Token requerido o invalido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Sin permiso", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Libro no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Books"],
        summary: "Eliminar libro",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          204: { description: "Libro eliminado" },
          401: { description: "Token requerido o invalido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Sin permiso", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Libro no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/traffic/error": {
      get: {
        tags: ["Traffic"],
        summary: "Generar error 500 de prueba",
        responses: {
          500: { description: "Error simulado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/traffic/redirect": {
      get: {
        tags: ["Traffic"],
        summary: "Generar redirect 302 de prueba",
        responses: {
          302: { description: "Redireccion a /api/health" },
        },
      },
    },
    "/api/traffic/external-book": {
      get: {
        tags: ["Traffic"],
        summary: "Buscar un libro en Open Library",
        parameters: [{ name: "title", in: "query", required: false, schema: { type: "string", example: "The Hobbit" } }],
        responses: {
          200: { description: "Resultado de Open Library", content: { "application/json": { schema: { $ref: "#/components/schemas/ExternalBookResponse" } } } },
          500: { description: "Error consultando API externa", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
};

module.exports = openApiDocument;
