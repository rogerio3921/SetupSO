/**
 * SetupSO MVP 2 — server/routes/events.js
 *
 * Endpoints para registro de eventos em um case.
 * Cada evento registra QUEM fez a ação (createdByUserId = req.user.id).
 *
 * GET    /api/cases/:caseId/events  → listar eventos do case
 * POST   /api/cases/:caseId/events  → registrar novo evento (auditado)
 * DELETE /api/events/:id            → desfazer evento (admin ou mesmo usuário)
 */

"use strict";

const express = require("express");
const router = express.Router({ mergeParams: true }); // herda caseId de casesRoutes
const { requireAuth, requireAdmin } = require("../middleware/auth");

// TODO (implementação): importar db e uuid.

/**
 * Tipos de ação válidos por modo de evento:
 *   mode "in_out"   → action: "in" | "out"
 *   mode "start_end"→ action: "start" | "end"
 */
const VALID_ACTIONS = new Set(["in", "out", "start", "end"]);

/** GET /api/cases/:caseId/events */
router.get("/", requireAuth, (req, res) => {
  // TODO:
  // const rows = db.prepare(
  //   "SELECT e.*, u.display_name as registeredBy FROM events e " +
  //   "LEFT JOIN users u ON u.id = e.created_by_user_id " +
  //   "WHERE e.case_id = ? ORDER BY e.event_timestamp ASC"
  // ).all(req.params.caseId);
  // res.json(rows);
  res.status(501).json({ error: "Não implementado ainda." });
});

/** POST /api/cases/:caseId/events */
router.post("/", requireAuth, (req, res) => {
  // Body: { eventType: string, action: "in"|"out"|"start"|"end", eventTimestamp?: ISO string, isManualOverride?: boolean }
  // TODO:
  // const { eventType, action, eventTimestamp, isManualOverride } = req.body;
  // if (!eventType || !VALID_ACTIONS.has(action)) return res.status(400).json({ error: "eventType e action válido são obrigatórios." });
  // const now = new Date().toISOString();
  // const id = uuidv4();
  // db.prepare("INSERT INTO events (id,case_id,event_type,action,event_timestamp,is_manual_override,created_by_user_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
  //   .run(id, req.params.caseId, eventType, action, eventTimestamp || now, isManualOverride ? 1 : 0, req.user.id, now);
  // res.status(201).json({ id, caseId: req.params.caseId, eventType, action, registeredBy: req.user.displayName, createdAt: now });
  res.status(501).json({ error: "Não implementado ainda." });
});

/**
 * DELETE /api/events/:id
 * Permite desfazer o último evento. Restrito ao próprio usuário ou admin.
 * Rota montada em server/index.js como /api/events/:id.
 */
router.delete("/:id", requireAuth, (req, res) => {
  // TODO:
  // const evt = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  // if (!evt) return res.status(404).json({ error: "Evento não encontrado." });
  // if (req.user.role !== "admin" && evt.created_by_user_id !== req.user.id)
  //   return res.status(403).json({ error: "Sem permissão para desfazer este evento." });
  // db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
  // res.json({ message: "Evento removido." });
  res.status(501).json({ error: "Não implementado ainda." });
});

module.exports = router;
