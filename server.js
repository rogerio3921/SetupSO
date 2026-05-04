// SetupSO — Backend (Node.js + Express + SQLite + JWT)
"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const rateLimit = require("express-rate-limit");

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "setupso-dev-secret-change-in-prod";
const JWT_EXPIRES = "24h";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "setupso.db");
const BCRYPT_ROUNDS = 10;

/* Warn loudly when running with the default secret in production */
if (process.env.NODE_ENV === "production" && JWT_SECRET === "setupso-dev-secret-change-in-prod") {
  console.error("ERRO: JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET antes de iniciar em produção.");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Database setup                                                       */
/* ------------------------------------------------------------------ */
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS states (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data       TEXT    NOT NULL DEFAULT '{}',
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

/* ------------------------------------------------------------------ */
/* Express setup                                                        */
/* ------------------------------------------------------------------ */
const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

// Serve only the public/ subfolder (not the server source root)
app.use(express.static(path.join(__dirname, "public")));

/* ------------------------------------------------------------------ */
/* Rate limiting                                                        */
/* ------------------------------------------------------------------ */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // max 20 auth requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." }
});

const stateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 120,                   // 120 state requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de requisições atingido." }
});

/* ------------------------------------------------------------------ */
/* Auth middleware                                                      */
/* ------------------------------------------------------------------ */
function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token não fornecido." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/* ------------------------------------------------------------------ */
/* Auth routes                                                          */
/* ------------------------------------------------------------------ */

/* POST /api/auth/register */
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || username.length < 3)
    return res.status(400).json({ error: "Username deve ter no mínimo 3 caracteres." });
  if (!password || password.length < 8)
    return res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres." });

  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (exists) return res.status(409).json({ error: "Usuário já existe." });

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const info = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hash);
  db.prepare("INSERT INTO states (user_id, data) VALUES (?, '{}')").run(info.lastInsertRowid);

  const token = jwt.sign({ sub: info.lastInsertRowid, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.status(201).json({ token, username });
});

/* POST /api/auth/login */
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  const user = db.prepare("SELECT id, password FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "Usuário ou senha incorretos." });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Usuário ou senha incorretos." });

  const token = jwt.sign({ sub: user.id, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.json({ token, username });
});

/* ------------------------------------------------------------------ */
/* State routes (authenticated)                                         */
/* ------------------------------------------------------------------ */

/* GET /api/state — return the user's saved state */
app.get("/api/state", stateLimiter, requireAuth, (req, res) => {
  const row = db.prepare("SELECT data FROM states WHERE user_id = ?").get(req.user.sub);
  if (!row) {
    // Ensure row exists (defensive)
    db.prepare("INSERT OR IGNORE INTO states (user_id, data) VALUES (?, '{}')").run(req.user.sub);
    return res.json({ state: {} });
  }
  try {
    return res.json({ state: JSON.parse(row.data) });
  } catch {
    return res.json({ state: {} });
  }
});

/* PUT /api/state — overwrite the user's state */
app.put("/api/state", stateLimiter, requireAuth, (req, res) => {
  const data = req.body.state;
  if (data === undefined || data === null)
    return res.status(400).json({ error: "Campo 'state' é obrigatório." });

  let serialised;
  try {
    serialised = JSON.stringify(data);
  } catch {
    return res.status(400).json({ error: "Estado inválido (não serializável)." });
  }

  db.prepare(`
    INSERT INTO states (user_id, data, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(req.user.sub, serialised);

  return res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Start                                                                */
/* ------------------------------------------------------------------ */
app.listen(PORT, () => {
  console.log("SetupSO server running at http://localhost:" + PORT);
});
