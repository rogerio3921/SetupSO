// SetupSO — cases + events routes
'use strict';

var express = require('express');
var pool = require('../db');

var router = express.Router();

// PATCH /cases/:caseId — update case details / status / phases
router.patch('/:caseId', function (req, res) {
  var tenantId = req.user.tenantId;
  var caseId = req.params.caseId;
  var updates = [];
  var values = [tenantId, caseId];
  var idx = 3;

  if (req.body.data !== undefined) {
    updates.push('data = $' + idx);
    values.push(JSON.stringify(req.body.data));
    idx++;
  }
  if (req.body.status !== undefined) {
    updates.push('status = $' + idx);
    values.push(req.body.status);
    idx++;
  }
  if (req.body.patientPhase !== undefined) {
    updates.push('patient_phase = $' + idx);
    values.push(req.body.patientPhase);
    idx++;
  }
  if (req.body.roomPhase !== undefined) {
    updates.push('room_phase = $' + idx);
    values.push(req.body.roomPhase);
    idx++;
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  pool.query(
    'UPDATE cases SET ' + updates.join(', ') +
    ' WHERE tenant_id = $1 AND id = $2' +
    ' RETURNING id, room_id, code, status, patient_phase, room_phase, data, created_at, created_by_user_id',
    values
  ).then(function (result) {
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case não encontrado.' });
    }
    var c = result.rows[0];
    return res.json({
      id: c.id,
      roomId: c.room_id,
      code: c.code,
      status: c.status,
      patientPhase: c.patient_phase,
      roomPhase: c.room_phase,
      data: c.data,
      createdAt: c.created_at,
      createdByUserId: c.created_by_user_id
    });
  }).catch(function (err) {
    console.error('PATCH /cases/:caseId error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

// POST /cases/:caseId/events — register a new event
router.post('/:caseId/events', function (req, res) {
  var tenantId = req.user.tenantId;
  var caseId = req.params.caseId;
  var eventKey = req.body.eventKey;
  var action = req.body.action;
  var happenedAt = req.body.happenedAt || new Date().toISOString();
  var auto = !!req.body.auto;
  var userId = req.user.userId;

  if (!eventKey || !action) {
    return res.status(400).json({ error: 'eventKey e action são obrigatórios.' });
  }

  // Verify case belongs to tenant
  pool.query(
    'SELECT id FROM cases WHERE id = $1 AND tenant_id = $2',
    [caseId, tenantId]
  ).then(function (caseRes) {
    if (caseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Case não encontrado.' });
    }

    return pool.query(
      `INSERT INTO events (tenant_id, case_id, event_key, action, happened_at, auto, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, case_id, event_key, action, happened_at, auto, created_at, created_by_user_id`,
      [tenantId, caseId, eventKey, action, happenedAt, auto, userId]
    );
  }).then(function (result) {
    var e = result.rows[0];
    return res.status(201).json({
      id: e.id,
      caseId: e.case_id,
      eventKey: e.event_key,
      action: e.action,
      happenedAt: e.happened_at,
      auto: e.auto,
      createdAt: e.created_at,
      createdByUserId: e.created_by_user_id
    });
  }).catch(function (err) {
    console.error('POST /cases/:caseId/events error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

// GET /cases/:caseId/events — list all events for a case
router.get('/:caseId/events', function (req, res) {
  var tenantId = req.user.tenantId;
  var caseId = req.params.caseId;

  pool.query(
    `SELECT e.id, e.case_id, e.event_key, e.action, e.happened_at, e.auto,
            e.created_at, e.created_by_user_id, u.name AS created_by_name
     FROM events e
     LEFT JOIN users u ON e.created_by_user_id = u.id
     WHERE e.tenant_id = $1 AND e.case_id = $2
     ORDER BY e.happened_at ASC`,
    [tenantId, caseId]
  ).then(function (result) {
    return res.json(result.rows.map(function (e) {
      return {
        id: e.id,
        caseId: e.case_id,
        eventKey: e.event_key,
        action: e.action,
        happenedAt: e.happened_at,
        auto: e.auto,
        createdAt: e.created_at,
        createdByUserId: e.created_by_user_id,
        createdByName: e.created_by_name
      };
    }));
  }).catch(function (err) {
    console.error('GET /cases/:caseId/events error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

module.exports = router;
