FROM node:20-alpine

WORKDIR /app

# Instalar dependências de sistema necessárias para o bcrypt e better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
