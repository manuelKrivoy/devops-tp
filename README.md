# Book Library API

API REST de biblioteca de libros construida con **Express.js**, autenticación **JWT** y containerizada con **Docker**.

## Tecnologías

- **Node.js 20** + **Express 4**
- **JWT** (jsonwebtoken) para autenticación
- **bcrypt** para hasheo de contraseñas
- **Helmet** para cabeceras HTTP seguras
- **express-rate-limit** para protección contra abuso
- **Docker** con multi-stage build
- **Docker Compose** para levantar la API localmente

## Estructura del proyecto

```
├── src/
│   ├── config/
│   │   └── index.js              # Configuración (puerto, JWT secret, bcrypt rounds)
│   ├── controllers/
│   │   ├── authController.js     # Lógica de registro y login
│   │   └── bookController.js     # CRUD de libros
│   ├── middleware/
│   │   └── auth.js               # Middleware de autenticación JWT
│   ├── routes/
│   │   ├── auth.js               # Rutas de autenticación
│   │   └── books.js              # Rutas de libros
│   └── index.js                  # Entry point del servidor
├── Dockerfile                    # Imagen Docker multi-stage
├── docker-compose.yml            # Orquestación local con Docker Compose
├── .dockerignore                 # Archivos excluidos del build de Docker
├── .env.example                  # Variables de entorno de ejemplo
├── .gitignore
└── package.json
```

## Uso

### Requisitos previos en Windows

- Docker Desktop instalado y levantado

### Docker

```bash
# Construir la imagen Docker de la API
docker build -t book-library-api .

# Ejecutar un contenedor a partir de la imagen
docker run --name book-library-api -p 3000:3000 -e JWT_SECRET=tu_secreto_seguro book-library-api
```

### Docker Compose

```bash
# Levantar la API con Docker Compose
docker compose up --build

# Levantarla en segundo plano
docker compose up --build -d

# Detener y eliminar el contenedor
docker compose down
```

## Paso a paso con Docker Compose

1. Copiar `.env.example` a `.env` si querés definir valores propios para `JWT_SECRET` y otras variables.
2. Ejecutar `docker compose up --build`.
   Este comando construye la imagen y levanta el servicio `api` definido en `docker-compose.yml`.
3. Abrir `http://localhost:3000/api/health` en el navegador o probarlo con `curl`.
4. Ejecutar `docker compose down` cuando quieras detener y eliminar el contenedor.

## Verificación rápida

```bash
curl http://localhost:3000/api/health
```

Con Docker Compose:

```bash
docker compose up --build -d
curl http://localhost:3000/api/health
docker compose down
```

## Variables de entorno

| Variable         | Descripción                       | Default                         |
| ---------------- | --------------------------------- | ------------------------------- |
| `PORT`           | Puerto del servidor               | `3000`                          |
| `JWT_SECRET`     | Secreto para firmar tokens JWT    | Auto-generado (no usar en prod) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token    | `1h`                            |
| `IMAGE_NAME`     | Nombre/tag de imagen para Compose | `book-library-api:local`        |

> **Importante:** En producción, siempre definí `JWT_SECRET` con un valor seguro. Podés generar uno con `openssl rand -hex 32`.

## Endpoints

### Health Check

| Método | Ruta          | Auth | Descripción         |
| ------ | ------------- | ---- | ------------------- |
| GET    | `/api/health` | No   | Estado del servidor |

### Autenticación

| Método | Ruta                 | Auth | Descripción       |
| ------ | -------------------- | ---- | ----------------- |
| POST   | `/api/auth/register` | No   | Registrar usuario |
| POST   | `/api/auth/login`    | No   | Iniciar sesión    |

### Libros

| Método | Ruta             | Auth | Descripción                        |
| ------ | ---------------- | ---- | ---------------------------------- |
| GET    | `/api/books`     | No   | Listar todos los libros            |
| GET    | `/api/books/:id` | No   | Obtener un libro por ID            |
| POST   | `/api/books`     | JWT  | Crear un libro                     |
| PUT    | `/api/books/:id` | JWT  | Actualizar un libro (solo creador) |
| DELETE | `/api/books/:id` | JWT  | Eliminar un libro (solo creador)   |

## Ejemplos de uso

### Registrar usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "password": "miPassword123"
  }'
```

**Respuesta (201):**

```json
{
  "message": "Usuario registrado correctamente",
  "user": {
    "id": "uuid-del-usuario",
    "email": "juan@ejemplo.com",
    "name": "Juan Pérez"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Iniciar sesión

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@ejemplo.com",
    "password": "miPassword123"
  }'
```

### Crear un libro (requiere JWT)

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token-jwt>" \
  -d '{
    "title": "Cien años de soledad",
    "author": "Gabriel García Márquez",
    "year": 1967,
    "genre": "Realismo mágico",
    "isbn": "978-0-06-088328-7"
  }'
```

### Listar libros

```bash
curl http://localhost:3000/api/books
```

### Actualizar un libro (solo el creador)

```bash
curl -X PUT http://localhost:3000/api/books/<id-del-libro> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token-jwt>" \
  -d '{
    "year": 1970
  }'
```

### Eliminar un libro (solo el creador)

```bash
curl -X DELETE http://localhost:3000/api/books/<id-del-libro> \
  -H "Authorization: Bearer <tu-token-jwt>"
```

## Seguridad

- **Autenticación JWT**: Las rutas protegidas requieren un token `Bearer` en el header `Authorization`.
- **Hasheo de contraseñas**: bcrypt con 12 salt rounds.
- **Helmet**: Configura cabeceras HTTP de seguridad (X-Content-Type-Options, Strict-Transport-Security, etc.).
- **Rate limiting**: Máximo 20 requests por IP cada 15 minutos.
- **Validación de inputs**: Se validan tipos, longitudes y formatos en cada endpoint.
- **Control de acceso**: Solo el creador de un libro puede editarlo o eliminarlo.
- **Body size limit**: Máximo 10kb por request.
- **Docker seguro**: Multi-stage build con usuario sin privilegios (no root).

## Testing

- `npm test`: ejecuta las pruebas del health check, login inválido y flujo básico de auth/CRUD.

## Descargar imagen publicada en Docker Hub

- `docker pull manukrivoy/book-library-api:latest `: descarga la imagen publicada en Docker Hub. Luego, podés ejecutar un contenedor con esta imagen usando el comando `docker run` o `docker compose` como se muestra en la sección de uso.

```

## Notas

- Los datos se almacenan en memoria. Al reiniciar el servidor se pierden. Para producción, conectar una base de datos (PostgreSQL, MongoDB, etc.).
```
