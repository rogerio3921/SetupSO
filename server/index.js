/**
 * SetupSO MVP 2 — server/index.js
 *
 * Ponto de entrada do servidor Express.
 * Carrega variáveis de ambiente, configura middlewares globais
 * e registra as rotas da API.
 *
 * Iniciar:
 *   npm start          (produção)
 *   npm run dev        (desenvolvimento com nodemon)
 */

"use strict";

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Segurança e middlewares globais ───────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Rate limiting para endpoints de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde 15 minutos." },
});

// ─── Rotas da API ──────────────────────────────────────────────────────────
// TODO (implementação): descomentar e criar os arquivos abaixo após npm install
//
// const authRoutes   = require("./routes/auth");
// const roomsRoutes  = require("./routes/rooms");
// const casesRoutes  = require("./routes/cases");
// const eventsRoutes = require("./routes/events");
// const usersRoutes  = require("./routes/users");
// const migrateRoutes = require("./routes/migrate");
//
// app.use("/api/auth",    authLimiter, authRoutes);
// app.use("/api/rooms",   roomsRoutes);
// app.use("/api/cases",   casesRoutes);
// app.use("/api/events",  eventsRoutes);
// app.use("/api/users",   usersRoutes);
// app.use("/api/migrate", migrateRoutes);

// ─── Frontend estático ─────────────────────────────────────────────────────
// Serve os arquivos do frontend (index8.html / app.js) a partir de /public
// Em produção, pode ser substituído por nginx ou CDN.
app.use(express.static(path.join(__dirname, "../public")));

// Fallback para SPA (rota não encontrada → index.html)
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// ─── Health-check ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "MVP2", ts: new Date().toISOString() });
});

// ─── Erro global ──────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erro interno" });
});

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SetupSO] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[SetupSO] Ambiente: ${process.env.NODE_ENV || "development"}`);
});
