/**
 * SetupSO MVP 2 — server/middleware/auth.js
 *
 * Middleware de autenticação via JWT.
 * Adiciona `req.user` com { id, username, displayName, role } quando o token é válido.
 *
 * Uso nas rotas:
 *   const { requireAuth, requireAdmin } = require("../middleware/auth");
 *   router.get("/endpoint", requireAuth, handler);
 *   router.post("/admin-endpoint", requireAuth, requireAdmin, handler);
 */

"use strict";

// TODO (implementação): importar jsonwebtoken e usar process.env.JWT_SECRET
// const jwt = require("jsonwebtoken");

/**
 * Verifica o Bearer token no header Authorization.
 * Retorna 401 se ausente ou inválido.
 */
function requireAuth(req, res, next) {
  // TODO (implementação):
  // const header = req.headers.authorization || "";
  // const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  // if (!token) return res.status(401).json({ error: "Token não fornecido." });
  // try {
  //   req.user = jwt.verify(token, process.env.JWT_SECRET);
  //   next();
  // } catch {
  //   return res.status(401).json({ error: "Token inválido ou expirado." });
  // }
  next(); // remover esta linha após implementação
}

/**
 * Exige que o usuário autenticado tenha role === "admin".
 * Deve ser usado APÓS requireAuth.
 */
function requireAdmin(req, res, next) {
  // TODO (implementação):
  // if (!req.user || req.user.role !== "admin") {
  //   return res.status(403).json({ error: "Acesso restrito a administradores." });
  // }
  next(); // remover esta linha após implementação
}

module.exports = { requireAuth, requireAdmin };
