/**
 * Rotas de usuários (admin only para criação/edição).
 * GET    /api/v1/users
 * POST   /api/v1/users
 * PATCH  /api/v1/users/:id
 */
const router = require("express").Router();
const bcrypt = require("bcrypt");
const { requireRole } = require("../middleware/auth");
const db = require("../db");

// GET /users — admin only
router.get("/", requireRole("admin"), async (req, res, next) => {
  try {
    const users = await db("users")
      .select("id", "name", "username", "role", "active", "created_at")
      .orderBy("name");
    return res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /users — admin only
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: "name, username e password são obrigatórios." });
    }
    if (!["admin", "collaborator"].includes(role || "collaborator")) {
      return res.status(400).json({ error: "role inválido. Use 'admin' ou 'collaborator'." });
    }

    const exists = await db("users").where({ username }).first();
    if (exists) {
      return res.status(409).json({ error: "Username já em uso." });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
    const password_hash = await bcrypt.hash(password, rounds);

    await db("users").insert({
      name,
      username,
      password_hash,
      role: role || "collaborator",
      active: true,
      created_by_user_id: req.user.id,
    });

    const created = await db("users").where({ username }).select("id", "name", "username", "role").first();
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const isAdmin = req.user.role === "admin";
    const isSelf = req.user.id === targetId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }

    const allowed = {};

    // Admin pode alterar role e active
    if (isAdmin) {
      if (req.body.role !== undefined) allowed.role = req.body.role;
      if (req.body.active !== undefined) allowed.active = req.body.active;
      if (req.body.name !== undefined) allowed.name = req.body.name;
    }

    // O próprio usuário pode trocar a senha
    if (isSelf && req.body.password) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
      allowed.password_hash = await bcrypt.hash(req.body.password, rounds);
    }

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: "Nenhum campo válido para atualizar." });
    }

    await db("users").where({ id: targetId }).update(allowed);
    return res.json({ id: targetId, updated: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
