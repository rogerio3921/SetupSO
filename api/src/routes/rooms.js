// SetupSO — rooms routes
'use strict';

var express = require('express');
var pool = require('../db');

var router = express.Router();

// GET /rooms — list active rooms for tenant
router.get('/', function (req, res) {
  var tenantId = req.user.tenantId;

  pool.query(
    'SELECT id, code FROM rooms WHERE tenant_id = $1 AND active = TRUE ORDER BY code',
    [tenantId]
  ).then(function (result) {
    return res.json(result.rows);
  }).catch(function (err) {
    console.error('GET /rooms error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

// GET /rooms/:roomId/active-case — get (or create) active case for room
router.get('/:roomId/active-case', function (req, res) {
  var tenantId = req.user.tenantId;
  var roomId = req.params.roomId;
  var userId = req.user.userId;

  // Verify room belongs to tenant
  pool.query(
    'SELECT id, code FROM rooms WHERE id = $1 AND tenant_id = $2 AND active = TRUE',
    [roomId, tenantId]
  ).then(function (roomRes) {
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada.' });
    }

    var room = roomRes.rows[0];

    // Find active case
    return pool.query(
      `SELECT id, room_id, code, status, patient_phase, room_phase, data, created_at, created_by_user_id
       FROM cases
       WHERE tenant_id = $1 AND room_id = $2 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, roomId]
    ).then(function (caseRes) {
      if (caseRes.rows.length > 0) {
        return caseRes.rows[0];
      }

      // Create new active case
      var today = new Date().toISOString().split('T')[0];

      return pool.query(
        'SELECT COUNT(*) FROM cases WHERE room_id = $1 AND tenant_id = $2',
        [roomId, tenantId]
      ).then(function (countRes) {
        var count = parseInt(countRes.rows[0].count, 10) + 1;
        var pad = count < 10 ? '0' + count : String(count);
        var code = room.code.replace(/\s+/g, '') + '-' + today + '-' + pad;

        var defaultData = {
          referenceDateISO: today,
          fullName: '',
          noticeNumber: '',
          procedureName: '',
          surgeonName: '',
          attendanceNumber: '',
          birthDate: '',
          allergies: '',
          weightKg: '',
          heightCm: '',
          plannedSurgeryTimeHHMM: ''
        };

        return pool.query(
          `INSERT INTO cases (tenant_id, room_id, code, created_by_user_id, data)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, room_id, code, status, patient_phase, room_phase, data, created_at, created_by_user_id`,
          [tenantId, roomId, code, userId, JSON.stringify(defaultData)]
        ).then(function (newRes) {
          return newRes.rows[0];
        });
      });
    });
  }).then(function (c) {
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
    console.error('GET /rooms/:roomId/active-case error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  });
});

module.exports = router;
