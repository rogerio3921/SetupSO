FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

# Migration runs automatically on startup (idempotent).
# Seed is run separately: docker compose exec api npm run db:seed
CMD ["node", "src/index.js"]
