// server/routes/events.js — Registro de eventos por case
// GET  /cases/:caseId/events  →  lista eventos do case
// POST /cases/:caseId/events  →  registrar novo evento (com auditoria)

const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

// GET /cases/:caseId/events
router.get("/", requireAuth, async (req, res) => {
  const { tenantId } = req.user;
  const caseId = parseInt(req.params.caseId, 10);

  try {
    // Verificar que o case pertence ao tenant
    const { rows: caseRows } = await query(
      "SELECT id FROM cases WHERE id = $1 AND tenant_id = $2",
      [caseId, tenantId]
    );
    if (caseRows.length === 0) return res.status(404).json({ error: "Case não encontrado." });

    const { rows } = await query(
      `SELECT e.id, e.event_key, e.action, e.happened_at, e.auto, e.created_at,
              u.id AS created_by_user_id, u.name AS created_by_name, u.username AS created_by_username
       FROM events e
       LEFT JOIN users u ON u.id = e.created_by_user_id
       WHERE e.case_id = $1
       ORDER BY e.happened_at ASC, e.id ASC`,
      [caseId]
    );

    return res.json({
      events: rows.map((e) => ({
        id: e.id,
        eventKey: e.event_key,
        action: e.action,
        happenedAt: e.happened_at,
        auto: e.auto,
        createdAt: e.created_at,
        createdByUserId: e.created_by_user_id,
        createdByName: e.created_by_name,
        createdByUsername: e.created_by_username
      }))
    });
  } catch (err) {
    console.error("[events/list]", err);
    return res.status(500).json({ error: "Erro ao listar eventos." });
  }
});

// POST /cases/:caseId/events
router.post("/", requireAuth, async (req, res) => {
  const { tenantId, userId } = req.user;
  const caseId = parseInt(req.params.caseId, 10);
  const { eventKey, action, auto, happenedAt } = req.body || {};

  if (!eventKey || !action) {
    return res.status(400).json({ error: "eventKey e action são obrigatórios." });
  }

  const VALID_ACTIONS = ["in", "out", "start", "end"];
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: "action inválida. Use: in, out, start, end." });
  }

  try {
    // Verificar que o case pertence ao tenant e está ativo
    const { rows: caseRows } = await query(
      "SELECT id, status FROM cases WHERE id = $1 AND tenant_id = $2",
      [caseId, tenantId]
    );
    if (caseRows.length === 0) return res.status(404).json({ error: "Case não encontrado." });
    if (caseRows[0].status === "closed") {
      return res.status(409).json({ error: "Case já está fechado." });
    }

    const ts = happenedAt ? new Date(happenedAt) : new Date();

    const { rows } = await query(
      `INSERT INTO events (tenant_id, case_id, event_key, action, happened_at, auto, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, event_key, action, happened_at, auto, created_at`,
      [tenantId, caseId, eventKey, action, ts, !!auto, userId]
    );

    const ev = rows[0];

    // Buscar dados do usuário para retornar na resposta
    const { rows: userRows } = await query(
      "SELECT name, username FROM users WHERE id = $1",
      [userId]
    );
    const u = userRows[0] || {};

    return res.status(201).json({
      event: {
        id: ev.id,
        eventKey: ev.event_key,
        action: ev.action,
        happenedAt: ev.happened_at,
        auto: ev.auto,
        createdAt: ev.created_at,
        createdByUserId: userId,
        createdByName: u.name,
        createdByUsername: u.username
      }
    });
  } catch (err) {
    console.error("[events/create]", err);
    return res.status(500).json({ error: "Erro ao registrar evento." });
  }
});

// DELETE /cases/:caseId/events/:eventId — desfazer evento (undo)
router.delete("/:eventId", requireAuth, async (req, res) => {
  const { tenantId } = req.user;
  const caseId = parseInt(req.params.caseId, 10);
  const eventId = parseInt(req.params.eventId, 10);

  try {
    // Buscar o último evento manual do case
    const { rows } = await query(
      `SELECT e.id, e.auto, e.created_by_user_id FROM events e
       JOIN cases c ON c.id = e.case_id
       WHERE e.id = $1 AND e.case_id = $2 AND c.tenant_id = $3`,
      [eventId, caseId, tenantId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Evento não encontrado." });

    await query("DELETE FROM events WHERE id = $1", [eventId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[events/delete]", err);
    return res.status(500).json({ error: "Erro ao desfazer evento." });
  }
});

module.exports = router;
