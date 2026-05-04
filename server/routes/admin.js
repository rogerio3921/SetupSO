// server/routes/admin.js — Gestão de usuários e tenants (admin only)
// GET    /admin/users           →  listar usuários do tenant
// POST   /admin/users           →  criar usuário
// PATCH  /admin/users/:id       →  editar (nome, role, active, reset senha)
//
// GET    /admin/tenants         →  listar todos os tenants (super-admin)
// POST   /admin/tenants         →  criar tenant (super-admin)

const express = require("express");
const bcrypt = require("bcrypt");
const { query } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// ─── Usuários ────────────────────────────────────────────────────────────────

// GET /admin/users
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const { tenantId } = req.user;
  try {
    const { rows } = await query(
      "SELECT id, username, name, role, active, created_at FROM users WHERE tenant_id = $1 ORDER BY name",
      [tenantId]
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error("[admin/users/list]", err);
    return res.status(500).json({ error: "Erro ao listar usuários." });
  }
});

// POST /admin/users
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const { tenantId } = req.user;
  const { username, password, name, role } = req.body || {};

  if (!username || !password || !name) {
    return res.status(400).json({ error: "username, password e name são obrigatórios." });
  }
  if (!["admin", "collaborator"].includes(role)) {
    return res.status(400).json({ error: "role deve ser 'admin' ou 'collaborator'." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
  }

  try {
    const hash = await bcrypt.hash(String(password), 12);
    const { rows } = await query(
      "INSERT INTO users (tenant_id, username, password_hash, name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, name, role, active, created_at",
      [tenantId, String(username).trim(), hash, String(name).trim(), role]
    );
    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username já existe neste hospital." });
    }
    console.error("[admin/users/create]", err);
    return res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

// PATCH /admin/users/:id
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const { tenantId } = req.user;
  const userId = parseInt(req.params.id, 10);
  const { name, role, active, password } = req.body || {};

  try {
    const sets = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { sets.push("name = $" + idx++); params.push(String(name).trim()); }
    if (role !== undefined) {
      if (!["admin", "collaborator"].includes(role)) {
        return res.status(400).json({ error: "role inválida." });
      }
      sets.push("role = $" + idx++); params.push(role);
    }
    if (active !== undefined) { sets.push("active = $" + idx++); params.push(!!active); }
    if (password !== undefined) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      }
      const hash = await bcrypt.hash(String(password), 12);
      sets.push("password_hash = $" + idx++);
      params.push(hash);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar." });
    }

    params.push(userId, tenantId);
    const { rows } = await query(
      "UPDATE users SET " + sets.join(", ") + " WHERE id = $" + idx++ + " AND tenant_id = $" + idx + " RETURNING id, username, name, role, active",
      params
    );

    if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado." });
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error("[admin/users/update]", err);
    return res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
});

// ─── Tenants (gestão de hospitais — todos os tenants) ──────────────────────

// GET /admin/tenants
router.get("/tenants", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT id, name, slug, active, created_at FROM tenants ORDER BY name"
    );
    return res.json({ tenants: rows });
  } catch (err) {
    console.error("[admin/tenants/list]", err);
    return res.status(500).json({ error: "Erro ao listar tenants." });
  }
});

// POST /admin/tenants
router.post("/tenants", requireAuth, requireAdmin, async (req, res) => {
  const { name, slug, adminUsername, adminPassword, adminName } = req.body || {};

  if (!name || !slug || !adminUsername || !adminPassword) {
    return res.status(400).json({ error: "name, slug, adminUsername e adminPassword são obrigatórios." });
  }

  try {
    const { rows: tenantRows } = await query(
      "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug",
      [String(name).trim(), String(slug).trim().toLowerCase()]
    );
    const tenant = tenantRows[0];

    const hash = await bcrypt.hash(String(adminPassword), 12);
    await query(
      "INSERT INTO users (tenant_id, username, password_hash, name, role) VALUES ($1,$2,$3,$4,'admin')",
      [tenant.id, String(adminUsername).trim(), hash, String(adminName || adminUsername).trim()]
    );

    // Criar sala padrão
    await query(
      "INSERT INTO rooms (tenant_id, code) VALUES ($1, $2)",
      [tenant.id, "Sala 1"]
    );

    return res.status(201).json({ tenant });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Slug já existe. Escolha outro." });
    }
    console.error("[admin/tenants/create]", err);
    return res.status(500).json({ error: "Erro ao criar hospital." });
  }
});

module.exports = router;
