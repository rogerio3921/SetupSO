// SetupSO — authentication & RBAC middleware
'use strict';

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  var authHeader = req.headers['authorization'];
  var token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação necessário.' });
  }

  try {
    var decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Permissão de administrador necessária.' });
}

module.exports = { authenticateToken, requireAdmin };
