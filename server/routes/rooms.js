// server/routes/rooms.js — CRUD de salas cirúrgicas
// GET  /rooms         →  lista salas do tenant
// POST /rooms         →  criar sala (admin)
// PATCH /rooms/:id    →  editar sala (admin)

const express = require("express");
const { query } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /rooms
router.get("/", requireAuth, async (req, res) => {
  const { tenantId } = req.user;
  try {
    const { rows } = await query(
      "SELECT id, code, active, created_at FROM rooms WHERE tenant_id = $1 ORDER BY id",
      [tenantId]
    );
    return res.json({ rooms: rows });
  } catch (err) {
    console.error("[rooms/list]", err);
    return res.status(500).json({ error: "Erro ao listar salas." });
  }
});

// GET /rooms/:roomId/active-case
// Retorna o case ativo da sala (ou cria um novo)
router.get("/:roomId/active-case", requireAuth, async (req, res) => {
  const { tenantId, userId } = req.user;
  const roomId = parseInt(req.params.roomId, 10);

  try {
    // Verificar se a sala pertence ao tenant
    const { rows: roomRows } = await query(
      "SELECT id, code FROM rooms WHERE id = $1 AND tenant_id = $2",
      [roomId, tenantId]
    );
    if (roomRows.length === 0) {
      return res.status(404).json({ error: "Sala não encontrada." });
    }
    const room = roomRows[0];

    // Buscar case ativo
    let { rows: caseRows } = await query(
      "SELECT * FROM cases WHERE tenant_id = $1 AND room_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [tenantId, roomId]
    );

    // Se não existir, criar um novo
    if (caseRows.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { rows: countRows } = await query(
        "SELECT COUNT(*) AS cnt FROM cases WHERE tenant_id = $1 AND room_id = $2",
        [tenantId, roomId]
      );
      const seq = parseInt(countRows[0].cnt, 10) + 1;
      const code = room.code.replace(/\s+/g, "") + "-" + today + "-" + String(seq).padStart(2, "0");

      const { rows: newCase } = await query(
        `INSERT INTO cases (tenant_id, room_id, code, status, patient_phase, room_phase, data_json, created_by_user_id)
         VALUES ($1, $2, $3, 'active', 'open', 'open', $4, $5) RETURNING *`,
        [tenantId, roomId, code, JSON.stringify({ referenceDateISO: today }), userId]
      );
      caseRows = newCase;
    }

    const c = caseRows[0];
    // Buscar eventos do case
    const { rows: eventRows } = await query(
      `SELECT e.id, e.event_key, e.action, e.happened_at, e.auto, e.created_at,
              u.name AS created_by_name, u.username AS created_by_username
       FROM events e
       LEFT JOIN users u ON u.id = e.created_by_user_id
       WHERE e.case_id = $1
       ORDER BY e.happened_at ASC`,
      [c.id]
    );

    return res.json({
      case: {
        id: c.id,
        roomId: c.room_id,
        code: c.code,
        status: c.status,
        patientPhase: c.patient_phase,
        roomPhase: c.room_phase,
        data: c.data_json,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      events: eventRows.map((e) => ({
        id: e.id,
        eventKey: e.event_key,
        action: e.action,
        happenedAt: e.happened_at,
        auto: e.auto,
        createdAt: e.created_at,
        createdByName: e.created_by_name,
        createdByUsername: e.created_by_username
      }))
    });
  } catch (err) {
    console.error("[rooms/active-case]", err);
    return res.status(500).json({ error: "Erro ao buscar case ativo." });
  }
});

// POST /rooms (admin)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { tenantId } = req.user;
  const { code } = req.body || {};

  if (!code || !String(code).trim()) {
    return res.status(400).json({ error: "Código da sala é obrigatório." });
  }

  try {
    const { rows } = await query(
      "INSERT INTO rooms (tenant_id, code) VALUES ($1, $2) RETURNING id, code, active, created_at",
      [tenantId, String(code).trim()]
    );
    return res.status(201).json({ room: rows[0] });
  } catch (err) {
    console.error("[rooms/create]", err);
    return res.status(500).json({ error: "Erro ao criar sala." });
  }
});

// PATCH /rooms/:id (admin)
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { tenantId } = req.user;
  const roomId = parseInt(req.params.id, 10);
  const { code, active } = req.body || {};

  try {
    const sets = [];
    const params = [];
    let idx = 1;

    if (code !== undefined) { sets.push("code = $" + idx++); params.push(String(code).trim()); }
    if (active !== undefined) { sets.push("active = $" + idx++); params.push(!!active); }

    if (sets.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar." });
    }

    params.push(roomId, tenantId);
    const { rows } = await query(
      "UPDATE rooms SET " + sets.join(", ") + " WHERE id = $" + idx++ + " AND tenant_id = $" + idx + " RETURNING id, code, active",
      params
    );

    if (rows.length === 0) return res.status(404).json({ error: "Sala não encontrada." });
    return res.json({ room: rows[0] });
  } catch (err) {
    console.error("[rooms/update]", err);
    return res.status(500).json({ error: "Erro ao atualizar sala." });
  }
});

module.exports = router;
