/**
 * SetupSO MVP 2 — server/routes/migrate.js
 *
 * Endpoint de importação de dados do localStorage (migração única).
 * Permite que um administrador faça upload do JSON exportado pelo app offline
 * e os dados sejam persistidos no banco com campos de auditoria.
 *
 * POST /api/migrate/import → importar dump do localStorage
 * GET  /api/migrate/export → exportar todos os dados do banco em JSON compatível
 */

"use strict";

const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");

// TODO (implementação): importar db e uuid.

/**
 * POST /api/migrate/import
 *
 * Body: o JSON gerado por JSON.stringify(localStorage.getItem("setupso_mvp2_state_ultra_robust_20260502_1105"))
 * (o mesmo objeto salvo pelo app.js atual: { rooms, cases, eventsByCaseId })
 *
 * A rota:
 *   1. Valida a estrutura do payload.
 *   2. Upsert de rooms (cria se não existir, ignora duplicatas por code).
 *   3. Upsert de cases (cria se não existir por id).
 *   4. Upsert de events (cria se não existir por id).
 *   5. Registra o import em import_log.
 *
 * Idempotente: pode ser executado mais de uma vez sem duplicar dados.
 */
router.post("/import", requireAuth, requireAdmin, async (req, res) => {
  // TODO:
  // const payload = req.body; // { rooms: [], cases: [], eventsByCaseId: {} }
  // Validar estrutura mínima...
  // Executar dentro de uma transação (db.transaction()):
  //   - Para cada room em payload.rooms: INSERT OR IGNORE INTO rooms ...
  //   - Para cada case em payload.cases: INSERT OR IGNORE INTO cases ... (created_by_user_id = null para dados legados)
  //   - Para cada caseId em payload.eventsByCaseId:
  //       Para cada evento: INSERT OR IGNORE INTO events ... (created_by_user_id = null)
  //   - INSERT INTO import_log ...
  // res.json({ message: "Importação concluída.", casesImported, eventsImported });
  res.status(501).json({ error: "Não implementado ainda." });
});

/**
 * GET /api/migrate/export
 *
 * Exporta todos os dados em um formato compatível com a estrutura do localStorage,
 * permitindo backup ou retorno ao modo offline se necessário.
 */
router.get("/export", requireAuth, requireAdmin, (_req, res) => {
  // TODO:
  // const rooms = db.prepare("SELECT * FROM rooms").all();
  // const cases = db.prepare("SELECT * FROM cases").all();
  // const events = db.prepare("SELECT * FROM events ORDER BY case_id, event_timestamp").all();
  // const eventsByCaseId = {};
  // for (const e of events) {
  //   if (!eventsByCaseId[e.case_id]) eventsByCaseId[e.case_id] = [];
  //   eventsByCaseId[e.case_id].push(e);
  // }
  // res.json({ rooms, cases, eventsByCaseId, exportedAt: new Date().toISOString() });
  res.status(501).json({ error: "Não implementado ainda." });
});

module.exports = router;
