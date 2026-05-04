// SetupSO — auth routes: login + me
'use strict';

var express = require('express');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var pool = require('../db');
var auth = require('../middleware/auth');

var router = express.Router();

// POST /auth/login
router.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var tenantSlug = req.body.tenant;

  if (!username || !password || !tenantSlug) {
    return res.status(400).json({ error: 'username, password e tenant são obrigatórios.' });
  }

  // Resolve tenant
  pool.query('SELECT id, name, slug FROM tenants WHERE slug = $1 AND active = TRUE', [tenantSlug])
    .then(function (tenantRes) {
      if (tenantRes.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      var tenant = tenantRes.rows[0];

      return pool.query(
        'SELECT id, username, name, password_hash, role FROM users WHERE tenant_id = $1 AND username = $2 AND active = TRUE',
        [tenant.id, username]
      ).then(function (userRes) {
        if (userRes.rows.length === 0) {
          return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        var user = userRes.rows[0];

        return bcrypt.compare(password, user.password_hash).then(function (valid) {
          if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
          }

          var payload = {
            userId: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name
          };

          var token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'change-me',
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
          );

          return res.json({
            token: token,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role
            },
            tenant: {
              id: tenant.id,
              slug: tenant.slug,
              name: tenant.name
            }
          });
        });
      });
    })
    .catch(function (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Erro interno.' });
    });
});

// GET /auth/me
router.get('/me', auth.authenticateToken, function (req, res) {
  return res.json({
    user: {
      id: req.user.userId,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role
    },
    tenant: {
      id: req.user.tenantId,
      slug: req.user.tenantSlug,
      name: req.user.tenantName
    }
  });
});

module.exports = router;
