/**
 * SetupSO API — Entry point
 * MVP 3 (Online) — Node.js + Express
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./src/routes/auth");
const usersRoutes = require("./src/routes/users");
const roomsRoutes = require("./src/routes/rooms");
const casesRoutes = require("./src/routes/cases");
const eventsRoutes = require("./src/routes/events");
const reportsRoutes = require("./src/routes/reports");
const importRoutes = require("./src/routes/import");

const { requireAuth } = require("./src/middleware/auth");
const db = require("./src/db");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5500",
  credentials: true,
}));

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));

// ── Rate limiting (login) ─────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10,
  message: { error: "Muitas tentativas de login. Aguarde 5 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Rate limiting (API geral — rotas autenticadas) ────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 300, // ~5 req/s para ~10 usuários simultâneos
  message: { error: "Limite de requisições atingido. Tente novamente em breve." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", loginLimiter, authRoutes);
app.use("/api/v1/users", apiLimiter, requireAuth, usersRoutes);
app.use("/api/v1/rooms", apiLimiter, requireAuth, roomsRoutes);
app.use("/api/v1/cases", apiLimiter, requireAuth, casesRoutes);
app.use("/api/v1/cases", apiLimiter, requireAuth, eventsRoutes);
app.use("/api/v1/reports", apiLimiter, requireAuth, reportsRoutes);
app.use("/api/v1/import", apiLimiter, requireAuth, importRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

// ── Run migrations then start ─────────────────────────────────────────────────
db.migrate.latest()
  .then(() => {
    app.listen(PORT, () => {
      console.log("SetupSO API rodando em http://localhost:" + PORT);
      console.log("Ambiente: " + (process.env.NODE_ENV || "development"));
    });
  })
  .catch((err) => {
    console.error("Falha nas migrações:", err);
    process.exit(1);
  });
