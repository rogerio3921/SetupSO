/**
 * Rotas de autenticação.
 * POST /api/v1/auth/login
 * GET  /api/v1/auth/me
 */
const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

// POST /auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username e senha são obrigatórios." });
    }

    const user = await db("users").where({ username, active: true }).first();

    if (!user) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get("/me", require("../middleware/auth").requireAuth, async (req, res, next) => {
  try {
    const user = await db("users")
      .where({ id: req.user.id })
      .select("id", "name", "username", "role", "active")
      .first();

    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    return res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
