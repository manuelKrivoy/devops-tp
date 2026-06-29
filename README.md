# API Book Library

Trabajo practico para la materia **DevOps** de la **Universidad de Palermo (UP)**. El proyecto consiste en una **API REST** para gestion de libros, con **CI/CD automatizado**, **dockerizacion**, publicacion de imagen Docker y **deploy en Render** usando **GitHub Actions**.

## Objetivo del TP

Este TP busca mostrar un flujo DevOps completo sobre una aplicacion Node.js:

- desarrollo de una API REST
- ejecucion automatica de pruebas con GitHub Actions
- construccion de una imagen Docker
- publicacion de la imagen en Docker Hub
- despliegue automatico en Render

## Tecnologias

- **Node.js 20** + **Express 4**
- **JWT** para autenticacion
- **bcrypt** para hasheo de contrasenas
- **Helmet** para cabeceras HTTP seguras
- **express-rate-limit** para proteccion contra abuso
- **Swagger / OpenAPI** para documentacion interactiva
- **Docker** con multi-stage build
- **Docker Compose** para entorno local
- **GitHub Actions** para CI/CD
- **Render** para despliegue
- **Sentry** para monitoreo de errores y respuestas HTTP

## Docker y CI/CD

### Para que sirve Docker

Docker permite empaquetar la aplicacion con sus dependencias en un contenedor reproducible. Esto evita diferencias entre entornos y hace mas simple correr la API localmente, en CI y en produccion.

### Que hace el Dockerfile y para que se usa

El archivo `Dockerfile` define como construir la imagen de la aplicacion.

En este proyecto:

- usa una build multi-stage
- instala dependencias con `npm ci --omit=dev`
- copia solo lo necesario a la imagen final
- ejecuta la app con un usuario no root
- expone el puerto `3000`

Se usa para generar una imagen liviana, segura y lista para ejecutarse en cualquier entorno compatible con Docker.

### Para que sirve Docker Compose y para que usarlo localmente

El archivo `docker-compose.yml` sirve para levantar la API en local de forma simple y consistente.

En este proyecto se usa para:

- construir la imagen localmente
- correr el contenedor con el puerto `3000:3000`
- inyectar variables de entorno desde `.env`
- facilitar pruebas y validaciones sin instalar Node.js directamente en la maquina

Uso local:

```bash
docker compose up --build
```

Para detenerlo:

```bash
docker compose down
```

### Para que sirve el workflow de Docker

El workflow `docker-publish.yml` automatiza el flujo de entrega continua cuando hay un `push` a `master`.

Ese workflow:

- hace checkout del repositorio
- configura Docker Buildx
- inicia sesion en Docker Hub
- genera metadatos y tags de imagen
- construye y publica la imagen Docker
- dispara el deploy en Render mediante un deploy hook

## Workflows definidos

El proyecto tiene dos workflows en `.github/workflows`.

### 1. `node.js.yml`

Nombre del workflow: `Node.js CI`

Se ejecuta en:

- `push` a `master`
- `pull_request` contra `master`

Su objetivo es validar calidad basica del proyecto. Hace lo siguiente:

- descarga el codigo
- configura Node.js en versiones `18.x`, `20.x` y `22.x`
- instala dependencias con `npm ci`
- ejecuta `npm run build --if-present`
- ejecuta `npm test`

Este workflow corresponde al proceso de **CI**.

### 2. `docker-publish.yml`

Nombre del workflow: `Publish Docker Image`

Se ejecuta en:

- `push` a `master`

Su objetivo es automatizar la entrega y despliegue. Hace lo siguiente:

- construye la imagen Docker de la API
- la publica en Docker Hub con tags como `latest` y el SHA del commit
- llama al deploy hook de Render para actualizar la aplicacion desplegada

Este workflow cubre la parte de **CD** del proyecto.

## Estructura del proyecto

```text
.
├── .github/
│   └── workflows/
│       ├── docker-publish.yml      # Build, push a Docker Hub y deploy en Render
│       └── node.js.yml             # CI con instalacion, build y tests
├── src/
│   ├── config/
│   │   ├── index.js                # Configuracion general de la app
│   │   └── instrument.js           # Inicializacion de Sentry
│   ├── controllers/
│   │   ├── authController.js       # Registro y login
│   │   └── bookController.js       # Operaciones CRUD de libros
│   ├── middleware/
│   │   └── auth.js                 # Middleware JWT
│   ├── routes/
│   │   ├── auth.js                 # Rutas de autenticacion
│   │   └── books.js                # Rutas de libros
│   ├── swagger.js                  # Especificacion OpenAPI
│   └── index.js                    # Punto de entrada del servidor
├── .dockerignore                   # Archivos excluidos del build
├── .env                            # Variables locales
├── .env_example                    # Ejemplo de variables de entorno
├── Dockerfile                      # Definicion de la imagen Docker
├── docker-compose.yml              # Ejecucion local con Docker Compose
├── package.json
└── README.md
```

## Variables de entorno

### Variables locales en `.env`

Para correr el proyecto localmente o con Docker Compose se usan variables en el archivo `.env`.

Variables actuales:

| Variable                    | Descripcion                                                           | Valor por defecto                         |
| --------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `PORT`                      | Puerto donde corre la API                                             | `3000`                                    |
| `JWT_SECRET`                | Secreto para firmar tokens JWT                                        | si no existe, la app genera uno aleatorio |
| `JWT_EXPIRES_IN`            | Tiempo de expiracion del token                                        | `1h`                                      |
| `SENTRY_DSN`                | DSN del proyecto en Sentry. Si esta vacio, Sentry queda deshabilitado | vacio                                     |
| `SENTRY_ENVIRONMENT`        | Ambiente reportado a Sentry                                           | `NODE_ENV` o `production`                 |
| `SENTRY_RELEASE`            | Version/release reportada a Sentry                                    | `RENDER_GIT_COMMIT` o `dev`               |
| `SENTRY_TRACES_SAMPLE_RATE` | Porcentaje de trazas enviadas a Sentry                                | `1`                                       |
| `API_URL`                   | URL base usada por el script de trafico                               | `http://localhost:3000`                   |
| `REQUESTS_PER_MINUTE`       | Maximo de requests por minuto del script de trafico                   | `5`                                       |
| `TOTAL_REQUESTS`            | Cantidad total de requests del script de trafico                      | `10`                                      |
| `REQUEST_TIMEOUT_MS`        | Timeout por request del script de trafico                             | `10000`                                   |

Ejemplo:

```env
PORT=3000
JWT_SECRET=tu_secreto_super_seguro_aqui
JWT_EXPIRES_IN=1h
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=dev
SENTRY_TRACES_SAMPLE_RATE=1
API_URL=http://localhost:3000
REQUESTS_PER_MINUTE=5
TOTAL_REQUESTS=10
REQUEST_TIMEOUT_MS=10000
```

### Variables en GitHub Actions

Para que los workflows funcionen en GitHub hay que definir variables y secretos en el repositorio.

Secrets necesarios:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `RENDER_DEPLOY_HOOK_URL`

Repository variable necesaria:

- `DOCKERHUB_REPOSITORY`

En el workflow `docker-publish.yml` se arma el nombre final de la imagen asi:

```text
${{ secrets.DOCKERHUB_USERNAME }}/${{ vars.DOCKERHUB_REPOSITORY }}
```

### Diferencias entre `.env` y variables de GitHub

`.env`:

- se usa en ejecucion local
- lo consume la aplicacion o Docker Compose
- define configuracion funcional de la API, como puerto y JWT

GitHub Actions variables/secrets:

- se usan solo durante los workflows de CI/CD
- permiten autenticarse contra servicios externos
- no configuran el comportamiento interno de la API local, sino el pipeline automatizado

Diferencia clave:

- `.env` configura la **aplicacion**
- `Secrets` y `Variables` de GitHub configuran el **pipeline**

## Uso local

### Requisitos previos

- Docker Desktop instalado y en ejecucion

### Con Docker

```bash
docker build -t book-library-api .
docker run --name book-library-api -p 3000:3000 -e JWT_SECRET=tu_secreto_seguro book-library-api
```

### Con Docker Compose

```bash
docker compose up --build
```

En segundo plano:

```bash
docker compose up --build -d
```

Detener contenedores:

```bash
docker compose down
```

## Verificacion rapida

```bash
curl http://localhost:3000/api/health
```

## Documentacion de endpoints

La documentacion completa de endpoints, parametros, autenticacion, cuerpos de request y respuestas esta disponible en Swagger UI.

En local:

```text
http://localhost:3000/api-docs
```

En produccion:

```text
https://book-library-api-latest.onrender.com/api-docs
```

Tambien se puede consultar la especificacion OpenAPI en JSON.

En local:

```text
http://localhost:3000/api-docs.json
```

En produccion:

```text
https://book-library-api-latest.onrender.com/api-docs.json
```

## Seguridad

- autenticacion JWT en rutas protegidas
- hasheo de contrasenas con bcrypt
- uso de `helmet` para headers seguros
- rate limiting global
- limite de tamano de body
- control de acceso sobre libros creados por usuario
- contenedor ejecutado con usuario no root

## Monitoreo

El proyecto usa **Sentry** para observar el comportamiento de la API en produccion y facilitar el diagnostico de fallas.

### Como se implemento

- `src/config/instrument.js` inicializa Sentry antes de crear la app Express.
- La inicializacion usa `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` y `SENTRY_TRACES_SAMPLE_RATE`.
- Si `SENTRY_DSN` no esta definido, Sentry queda deshabilitado y la API funciona normalmente.
- El error handler global captura excepciones con `Sentry.captureException(err)` y devuelve `requestId` y `sentryEventId` en respuestas `500`.
- Un middleware global escucha el evento `finish` de cada respuesta HTTP y registra outcomes claros en Sentry.
- Las requests `HEAD` no generan evento manual de Sentry para evitar el doble log al consultar `/`.
- Los campos sensibles como `password`, `token`, `authorization`, `jwt` y `secret` se filtran antes de enviarse como contexto.

### Que registra

Para errores:

- excepcion capturada
- metodo HTTP
- ruta y URL solicitada
- parametros y query string
- body recibido por la API con campos sensibles filtrados
- `requestId` para correlacionar respuesta, consola y evento de Sentry

Para respuestas HTTP:

- mensaje `HTTP <outcome>: <METODO> <RUTA> -> <STATUS> (<DURACION>ms)`
- outcome `success`, `redirect`, `client_error` o `server_error`
- nivel `info`, `warning` o `error` segun el status
- metodo HTTP
- status code
- ruta solicitada
- duracion aproximada en milisegundos
- parametros y query string

Esto permite ver trafico exitoso, errores de cliente `4xx`, errores de servidor `5xx` y fallas reales capturadas como excepciones.

### Como probarlo

Con un `SENTRY_DSN` valido configurado en el entorno, levantar la API y ejecutar:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/traffic/error
```

En Sentry deberia verse un evento `info` para la respuesta exitosa y un evento de error para la excepcion simulada.

### Script de trafico para Sentry

El proyecto incluye `scripts/api-traffic.js` para generar requests controladas contra la API y validar que queden registradas en Sentry.

Uso local:

```bash
npm run traffic:sentry
```

Variables configurables:

```bash
API_URL=http://localhost:3000 REQUESTS_PER_MINUTE=5 TOTAL_REQUESTS=10 npm run traffic:sentry
```

Valores por defecto:

- `API_URL=http://localhost:3000`
- `REQUESTS_PER_MINUTE=5`
- `TOTAL_REQUESTS=10`
- `REQUEST_TIMEOUT_MS=10000`

El script alterna endpoints `2xx`, `4xx` y `5xx`, incluyendo `/`, `/api/health`, `/api/books`, `/api/no-existe`, `/api/traffic/error`, `/api/traffic/external-book`, registro, login y creacion de un libro. Con el limite por defecto consume como maximo 5 requests por minuto y 10 requests totales.

## Testing

- `npm test`: ejecuta las pruebas automatizadas del proyecto

## Imagen publicada

```bash
docker pull manukrivoy/book-library-api:latest
```

## Nota

- Los datos se almacenan en memoria. Al reiniciar el servidor se pierden.
