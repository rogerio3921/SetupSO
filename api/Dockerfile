# SetupSO API — Dockerfile
# This file will be used when the API backend is implemented.
# Place it in the ./api/ directory alongside server.js.

FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Run as non-root user
RUN addgroup -S setupso && adduser -S setupso -G setupso
USER setupso

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
