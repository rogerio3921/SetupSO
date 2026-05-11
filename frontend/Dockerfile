FROM node:20-alpine as builder

WORKDIR /app

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY --from=builder /app/build ./build
COPY public ./public

EXPOSE 3000

CMD ["npx", "serve", "-s", "build", "-l", "3000"]
