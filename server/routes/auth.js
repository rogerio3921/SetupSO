/**
 * SetupSO MVP 2 — server/routes/auth.js
 *
 * Endpoints de autenticação.
 *
 * POST /api/auth/login  → retorna JWT
 * POST /api/auth/logout → (sem estado; o cliente descarta o token)
 * GET  /api/auth/me     → retorna dados do usuário logado
 */

"use strict";

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

// TODO (implementação): importar better-sqlite3 (db), bcrypt e jsonwebtoken.
// Verificar credenciais contra a tabela users; gerar JWT com payload:
// { id, username, displayName, role }

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * Resposta: { token: string, user: { id, username, displayName, role } }
 */
router.post("/login", async (req, res) => {
  // TODO (implementação):
  // const { username, password } = req.body;
  // if (!username || !password) return res.status(400).json({ error: "Usuário e senha obrigatórios." });
  // const user = db.prepare("SELECT * FROM users WHERE username = ? AND is_active = 1").get(username);
  // if (!user) return res.status(401).json({ error: "Credenciais inválidas." });
  // const match = await bcrypt.compare(password, user.password_hash);
  // if (!match) return res.status(401).json({ error: "Credenciais inválidas." });
  // const token = jwt.sign(
  //   { id: user.id, username: user.username, displayName: user.display_name, role: user.role },
  //   process.env.JWT_SECRET,
  //   { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  // );
  // res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role } });
  res.status(501).json({ error: "Não implementado ainda." });
});

/**
 * POST /api/auth/logout
 * O servidor não mantém sessão; o cliente deve descartar o token.
 * Incluído por convenção e para futura blacklist de tokens.
 */
router.post("/logout", requireAuth, (_req, res) => {
  res.json({ message: "Logout realizado. Descarte o token no cliente." });
});

/**
 * GET /api/auth/me
 * Retorna os dados do usuário autenticado (a partir do JWT).
 */
router.get("/me", requireAuth, (req, res) => {
  // TODO (implementação): res.json({ user: req.user });
  res.status(501).json({ error: "Não implementado ainda." });
});

module.exports = router;
