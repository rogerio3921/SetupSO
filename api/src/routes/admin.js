// SetupSO — admin routes (admin role required)
'use strict';

var express = require('express');
var bcrypt = require('bcrypt');
var pool = require('../db');
var auth = require('../middleware/auth');

var router = express.Router();

// All admin routes require admin role
router.use(auth.requireAdmin);

// GET /admin/users — list all users in tenant
router.get('/users', function (req, res) {
  var tenantId = req.user.tenantId;

  pool.query(
    'SELECT id, username, name, role, active, created_at FROM users WHERE tenant_id = $1 ORDER BY name',
    [tenantId]
  ).then(function (result) {
    return res.json(result.rows);
  }).catch(function (err) {
    console.error('GET /admin/users error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

// POST /admin/users — create a new user in tenant
router.post('/users', function (req, res) {
  var tenantId = req.user.tenantId;
  var username = req.body.username;
  var name = req.body.name;
  var password = req.body.password;
  var role = req.body.role || 'collaborator';

  if (!username || !name || !password) {
    return res.status(400).json({ error: 'username, name e password são obrigatórios.' });
  }

  if (role !== 'admin' && role !== 'collaborator') {
    return res.status(400).json({ error: 'role deve ser "admin" ou "collaborator".' });
  }

  bcrypt.hash(password, 12).then(function (hash) {
    return pool.query(
      `INSERT INTO users (tenant_id, username, name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, role, active, created_at`,
      [tenantId, username, name, hash, role]
    );
  }).then(function (result) {
    return res.status(201).json(result.rows[0]);
  }).catch(function (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username já existe neste hospital.' });
    }
    console.error('POST /admin/users error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

// PATCH /admin/users/:id — activate, deactivate, change role, reset password
router.patch('/users/:id', function (req, res) {
  var tenantId = req.user.tenantId;
  var userId = req.params.id;
  var updates = [];
  var values = [tenantId, userId];
  var idx = 3;

  if (req.body.active !== undefined) {
    updates.push('active = $' + idx);
    values.push(!!req.body.active);
    idx++;
  }
  if (req.body.role !== undefined) {
    if (req.body.role !== 'admin' && req.body.role !== 'collaborator') {
      return res.status(400).json({ error: 'role deve ser "admin" ou "collaborator".' });
    }
    updates.push('role = $' + idx);
    values.push(req.body.role);
    idx++;
  }
  if (req.body.name !== undefined) {
    updates.push('name = $' + idx);
    values.push(req.body.name);
    idx++;
  }

  var passwordPromise = Promise.resolve(null);
  if (req.body.password !== undefined) {
    passwordPromise = bcrypt.hash(req.body.password, 12);
  }

  passwordPromise.then(function (hash) {
    if (hash !== null) {
      updates.push('password_hash = $' + idx);
      values.push(hash);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    return pool.query(
      'UPDATE users SET ' + updates.join(', ') +
      ' WHERE tenant_id = $1 AND id = $2' +
      ' RETURNING id, username, name, role, active',
      values
    ).then(function (result) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      return res.json(result.rows[0]);
    });
  }).catch(function (err) {
    console.error('PATCH /admin/users/:id error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

module.exports = router;
