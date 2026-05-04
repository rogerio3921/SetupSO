/**
 * SetupSO MVP 2 — server/routes/rooms.js
 *
 * Endpoints para gerenciamento de salas.
 *
 * GET    /api/rooms       → listar salas ativas
 * POST   /api/rooms       → criar sala (admin)
 * GET    /api/rooms/:id   → detalhes de uma sala
 * PATCH  /api/rooms/:id   → atualizar sala (admin)
 */

"use strict";

const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");

// TODO (implementação): importar db (better-sqlite3) e uuid.

/** GET /api/rooms */
router.get("/", requireAuth, (_req, res) => {
  // TODO: const rows = db.prepare("SELECT * FROM rooms WHERE is_active = 1 ORDER BY code").all();
  // res.json(rows);
  res.status(501).json({ error: "Não implementado ainda." });
});

/** POST /api/rooms */
router.post("/", requireAuth, requireAdmin, (req, res) => {
  // TODO:
  // const { code, name } = req.body;
  // if (!code) return res.status(400).json({ error: "'code' é obrigatório." });
  // const now = new Date().toISOString();
  // const id = uuidv4();
  // db.prepare("INSERT INTO rooms (id,code,name,is_active,created_at,updated_at) VALUES (?,?,?,1,?,?)")
  //   .run(id, code.trim(), name?.trim() || null, now, now);
  // res.status(201).json({ id, code, name });
  res.status(501).json({ error: "Não implementado ainda." });
});

/** GET /api/rooms/:id */
router.get("/:id", requireAuth, (req, res) => {
  // TODO: const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(req.params.id);
  // if (!room) return res.status(404).json({ error: "Sala não encontrada." });
  // res.json(room);
  res.status(501).json({ error: "Não implementado ainda." });
});

/** PATCH /api/rooms/:id */
router.patch("/:id", requireAuth, requireAdmin, (req, res) => {
  // TODO: atualizar code e/ou name. Nunca apagar fisicamente.
  res.status(501).json({ error: "Não implementado ainda." });
});

module.exports = router;
