// server/middleware/auth.js — Middleware de autenticação JWT
// SetupSO MVP online

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_production";

/**
 * Middleware: verifica o Bearer token no header Authorization.
 * Popula req.user = { userId, tenantId, role, username, name }.
 */
function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação necessário." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/**
 * Middleware: exige role 'admin'.
 * Deve ser usado após requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a administradores." });
  }
  next();
}

/**
 * Gera um JWT para o usuário dado.
 */
function signToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      username: user.username,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn }
  );
}

module.exports = { requireAuth, requireAdmin, signToken };
