/**
 * SetupSO MVP 2 — server/routes/users.js
 *
 * Endpoints para gerenciamento de usuários (somente admin).
 *
 * GET    /api/users       → listar usuários
 * POST   /api/users       → criar usuário
 * PATCH  /api/users/:id   → atualizar dados/senha
 * DELETE /api/users/:id   → desativar usuário (soft-delete)
 */

"use strict";

const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");

// TODO (implementação): importar db, bcrypt e uuid.

/** GET /api/users */
router.get("/", requireAuth, requireAdmin, (_req, res) => {
  // TODO: retornar usuários sem o campo password_hash
  // const rows = db.prepare("SELECT id,username,display_name,role,is_active,created_at FROM users ORDER BY display_name").all();
  // res.json(rows);
  res.status(501).json({ error: "Não implementado ainda." });
});

/** POST /api/users */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  // Body: { username, password, displayName, role: "operator"|"admin" }
  // TODO:
  // const { username, password, displayName, role = "operator" } = req.body;
  // if (!username || !password || !displayName) return res.status(400).json({ error: "username, password e displayName são obrigatórios." });
  // const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 12);
  // const now = new Date().toISOString();
  // const id = uuidv4();
  // db.prepare("INSERT INTO users (id,username,password_hash,display_name,role,is_active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)")
  //   .run(id, username.trim().toLowerCase(), hash, displayName.trim(), role, now, now);
  // res.status(201).json({ id, username, displayName, role });
  res.status(501).json({ error: "Não implementado ainda." });
});

/** PATCH /api/users/:id */
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  // Permite alterar displayName, role e/ou password.
  // TODO: validar e atualizar apenas os campos enviados; re-hash se password foi enviado.
  res.status(501).json({ error: "Não implementado ainda." });
});

/** DELETE /api/users/:id — soft-delete (is_active = 0) */
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  // Nunca apagar fisicamente (preserva auditoria).
  // TODO: db.prepare("UPDATE users SET is_active=0, updated_at=? WHERE id=?").run(new Date().toISOString(), req.params.id);
  res.status(501).json({ error: "Não implementado ainda." });
});

module.exports = router;
