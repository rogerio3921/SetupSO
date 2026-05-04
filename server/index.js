// server/index.js — Servidor principal SetupSO MVP online
// Node.js + Express + PostgreSQL + JWT Auth

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { migrate, bootstrapAdmin } = require("./db");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const caseRoutes = require("./routes/cases");
const eventRoutes = require("./routes/events");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globais ─────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Servir frontend estático
app.use(express.static(path.join(__dirname, "../public")));

// Rate limiting geral para todas as rotas da API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." }
});

// Rate limiting mais estrito para autenticação (anti-brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." }
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);

// ─── Rotas da API ────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/cases/:caseId/events", eventRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// Rate limiting para rotas de frontend (SPA fallback)
const staticLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});

// Fallback para SPA (redireciona para index.html)
app.get("*", staticLimiter, (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ─── Inicialização ───────────────────────────────────────────────────────────

async function start() {
  try {
    await migrate();
    await bootstrapAdmin();

    app.listen(PORT, () => {
      console.log("[server] SetupSO rodando em http://localhost:" + PORT);
      console.log("[server] Ambiente: " + (process.env.NODE_ENV || "development"));
    });
  } catch (err) {
    console.error("[server] Falha ao iniciar:", err);
    process.exit(1);
  }
}

start();
