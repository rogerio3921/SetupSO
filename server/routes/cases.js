/**
 * SetupSO MVP 2 — server/routes/cases.js
 *
 * Endpoints para gerenciamento de cases (procedimentos cirúrgicos).
 *
 * GET    /api/cases            → listar cases (filtros: roomId, status, date)
 * POST   /api/cases            → criar case (registra createdByUserId)
 * GET    /api/cases/:id        → detalhes + eventos de um case
 * PATCH  /api/cases/:id        → atualizar dados do paciente/aviso
 * POST   /api/cases/:id/close  → encerrar case (registra closedByUserId)
 */

"use strict";

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

// TODO (implementação): importar db e uuid.

/** GET /api/cases */
router.get("/", requireAuth, (req, res) => {
  // Suporte a filtros: ?roomId=&status=active&date=2026-05-04
  // TODO:
  // const { roomId, status, date } = req.query;
  // let sql = "SELECT * FROM cases WHERE 1=1";
  // const params = [];
  // if (roomId) { sql += " AND room_id = ?"; params.push(roomId); }
  // if (status) { sql += " AND status = ?"; params.push(status); }
  // if (date)   { sql += " AND reference_date_iso = ?"; params.push(date); }
  // sql += " ORDER BY created_at DESC";
  // const rows = db.prepare(sql).all(...params);
  // res.json(rows);
  res.status(501).json({ error: "Não implementado ainda." });
});

/** POST /api/cases */
router.post("/", requireAuth, (req, res) => {
  // Body esperado: { roomId, referenceDateISO, noticeName?, fullName?, ... }
  // TODO:
  // const { roomId, referenceDateISO, ...rest } = req.body;
  // if (!roomId || !referenceDateISO) return res.status(400).json({ error: "roomId e referenceDateISO são obrigatórios." });
  // const now = new Date().toISOString();
  // const id = uuidv4();
  // db.prepare("INSERT INTO cases (...) VALUES (...)").run(...);
  // res.status(201).json({ id, roomId, status: "active", createdAt: now });
  res.status(501).json({ error: "Não implementado ainda." });
});

/** GET /api/cases/:id */
router.get("/:id", requireAuth, (req, res) => {
  // TODO: retornar case + lista de eventos ordenados por event_timestamp
  res.status(501).json({ error: "Não implementado ainda." });
});

/** PATCH /api/cases/:id */
router.patch("/:id", requireAuth, (req, res) => {
  // Permite atualizar dados do paciente. Não altera status.
  // TODO: validar campos, atualizar updated_at
  res.status(501).json({ error: "Não implementado ainda." });
});

/** POST /api/cases/:id/close */
router.post("/:id/close", requireAuth, (req, res) => {
  // Body: { isAuto?: boolean }
  // Registra closedByUserId = req.user.id, closedAt = now, status = "completed"
  // TODO:
  // const now = new Date().toISOString();
  // db.prepare("UPDATE cases SET status='completed', closed_by_user_id=?, closed_at=?, updated_at=?, is_auto=? WHERE id=?")
  //   .run(req.user.id, now, now, req.body.isAuto ? 1 : 0, req.params.id);
  // res.json({ message: "Case encerrado." });
  res.status(501).json({ error: "Não implementado ainda." });
});

module.exports = router;
