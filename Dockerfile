# ==============================================
# ETAPA 1: Build (instalación de dependencias)
# ==============================================
# Imagen base ligera de Node 20 sobre Alpine Linux.
# Se usa como etapa intermedia solo para instalar dependencias.
FROM node:20-alpine AS build

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos solo los archivos de manifiesto para aprovechar la caché de capas.
# Si package.json no cambia, Docker reutiliza la capa y no reinstala.
COPY package.json package-lock.json* ./

# Instalamos solo dependencias de producción (sin devDependencies).
# npm ci es más rápido y determinista que npm install.
RUN npm ci --omit=dev

# ==============================================
# ETAPA 2: Producción (imagen final liviana)
# ==============================================
# Imagen limpia sin archivos de build innecesarios.
FROM node:20-alpine

# Creamos un grupo y usuario sin privilegios para no correr como root.
# Esto mitiga el impacto de posibles vulnerabilidades.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiamos node_modules desde la etapa de build (multi-stage build).
# Así la imagen final no necesita npm ni herramientas de compilación.
COPY --from=build /app/node_modules ./node_modules

# Copiamos el código fuente de la aplicación
COPY package.json ./
COPY src ./src

# Cambiamos al usuario sin privilegios (seguridad)
USER appuser

# Documentamos el puerto que usa la app (no lo publica, solo informa)
EXPOSE 3000

# Variable de entorno para que Express y otras libs optimicen para producción
ENV NODE_ENV=production

# Comando que ejecuta el contenedor al iniciar
CMD ["node", "src/index.js"]
