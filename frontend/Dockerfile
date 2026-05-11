FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY --from=builder /app/build ./build
COPY public ./public

EXPOSE 3000

CMD ["npm", "start"]
