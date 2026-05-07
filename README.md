# Book Library API

API REST de biblioteca de libros construida con **Express.js**, autenticación **JWT** y containerizada con **Docker**.

## Tecnologías

- **Node.js 20** + **Express 4**
- **JWT** (jsonwebtoken) para autenticación
- **bcrypt** para hasheo de contraseñas
- **Helmet** para cabeceras HTTP seguras
- **express-rate-limit** para protección contra abuso
- **Docker** con multi-stage build

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
├── .dockerignore                 # Archivos excluidos del build de Docker
├── .env.example                  # Variables de entorno de ejemplo
├── .gitignore
└── package.json
```

## Uso

### Requisitos previos

- Docker Desktop instalado y levantado

### Docker

```bash
# Construir la imagen Docker de la API
docker build -t book-library-api .

# Ejecutar un contenedor a partir de la imagen
docker run --name book-library-api -p 3000:3000 -e JWT_SECRET=tu_secreto_seguro book-library-api
```

## Paso a paso con Docker

1. Abrir Docker Desktop y esperar a que el motor de Docker quede activo.
2. Ejecutar `docker build -t book-library-api .`.
   Este comando construye la imagen de la aplicación usando el `Dockerfile` del proyecto.
3. Ejecutar `docker run --name book-library-api -p 3000:3000 -e JWT_SECRET=tu_secreto_seguro book-library-api`.
   Este comando crea y levanta un contenedor llamado `book-library-api`, publica el puerto `3000` del contenedor en el puerto `3000` de tu máquina y define la variable de entorno `JWT_SECRET`.
4. Abrir `http://localhost:3000/api/health` en el navegador o probarlo con `curl`.
   Si todo está bien, la API responde con un JSON con `status: ok`.
5. Ejecutar `docker stop book-library-api` cuando quieras detener la API.
   Este comando apaga el contenedor sin borrar la imagen.
6. Ejecutar `docker rm book-library-api` si querés eliminar el contenedor detenido.
   Esto limpia el contenedor creado anteriormente, pero no elimina la imagen.

## Verificación rápida

```bash
curl http://localhost:3000/api/health
```

## Variables de entorno

| Variable         | Descripción                    | Default                         |
| ---------------- | ------------------------------ | ------------------------------- |
| `PORT`           | Puerto del servidor            | `3000`                          |
| `JWT_SECRET`     | Secreto para firmar tokens JWT | Auto-generado (no usar en prod) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `1h`                            |

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
- **Rate limiting**: Máximo 100 requests por IP cada 15 minutos.
- **Validación de inputs**: Se validan tipos, longitudes y formatos en cada endpoint.
- **Control de acceso**: Solo el creador de un libro puede editarlo o eliminarlo.
- **Body size limit**: Máximo 10kb por request.
- **Docker seguro**: Multi-stage build con usuario sin privilegios (no root).

## Testing

- `npm test`: ejecuta las pruebas del health check, login inválido y flujo básico de auth/CRUD.

## Notas

- Los datos se almacenan en memoria. Al reiniciar el servidor se pierden. Para producción, conectar una base de datos (PostgreSQL, MongoDB, etc.).
