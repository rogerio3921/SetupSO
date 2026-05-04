FROM node:20-alpine

WORKDIR /app

# Instalar dependências primeiro (camada cacheável)
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar código
COPY server/ ./server/
COPY public/ ./public/

EXPOSE 3000

CMD ["node", "server/index.js"]
