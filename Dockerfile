# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Evitar que puppeteer descargue Chromium (no lo necesitamos para compilar TS)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-slim AS production

# Usar el Chromium del sistema en lugar del bundled de puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

# Instalar Chromium y sus dependencias para whatsapp-web.js / Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar solo dependencias de producción (PUPPETEER_SKIP_CHROMIUM_DOWNLOAD ya está activo)
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el build y los assets estáticos
COPY --from=builder /app/dist ./dist
COPY public ./public

EXPOSE 3000

CMD ["node", "dist/main"]
