// server/routes/auth.js — Rotas de autenticação
// POST /auth/login  →  { token, user }
// GET  /auth/me     →  { user }

const express = require("express");
const bcrypt = require("bcrypt");
const { query } = require("../db");
const { requireAuth, signToken } = require("../middleware/auth");

const router = express.Router();

// POST /auth/login
router.post("/login", async (req, res) => {
  const { username, password, tenantSlug } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "username e password são obrigatórios." });
  }

  try {
    // Buscar tenant (se fornecido; senão usa o primeiro ativo)
    let tenantQuery;
    let tenantParams;

    if (tenantSlug) {
      tenantQuery = "SELECT id FROM tenants WHERE slug = $1 AND active = TRUE";
      tenantParams = [tenantSlug];
    } else {
      tenantQuery = "SELECT id FROM tenants WHERE active = TRUE ORDER BY id LIMIT 1";
      tenantParams = [];
    }

    const { rows: tenants } = await query(tenantQuery, tenantParams);
    if (tenants.length === 0) {
      return res.status(401).json({ error: "Hospital não encontrado." });
    }
    const tenantId = tenants[0].id;

    // Buscar usuário
    const { rows: users } = await query(
      "SELECT id, tenant_id, username, password_hash, name, role, active FROM users WHERE tenant_id = $1 AND username = $2",
      [tenantId, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Usuário ou senha incorretos." });
    }

    const user = users[0];

    if (!user.active) {
      return res.status(401).json({ error: "Conta desativada. Contate o administrador." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Usuário ou senha incorretos." });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// GET /auth/me
router.get("/me", requireAuth, (req, res) => {
  const { userId, tenantId, role, username, name } = req.user;
  return res.json({ user: { id: userId, tenantId, role, username, name } });
});

module.exports = router;
