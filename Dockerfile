# Dockerfile
FROM node:18-slim

# Instalar dependencias del sistema necesarias para Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto (Render lo detecta automáticamente)
EXPOSE 3001

# Comando para iniciar la app
CMD ["node", "server.js"]