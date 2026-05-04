/**
 * Middleware de autenticação JWT.
 * Verifica o token Bearer e popula req.user com { id, username, role }.
 */
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação não fornecido." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/**
 * Role-based access control middleware.
 * MUST be used after requireAuth (depends on req.user being populated).
 * Returns 401 if req.user is missing (auth middleware not applied),
 * or 403 if the authenticated user's role doesn't match the required role.
 */
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
