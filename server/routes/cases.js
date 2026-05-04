// server/routes/cases.js — Gestão de cases (procedimentos/cirurgias)
// GET   /cases/:caseId          →  detalhes do case
// PATCH /cases/:caseId          →  editar detalhes (data_json, status)
// POST  /cases/:caseId/close    →  fechar case e criar novo para a sala

const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /cases/:caseId
router.get("/:caseId", requireAuth, async (req, res) => {
  const { tenantId } = req.user;
  const caseId = parseInt(req.params.caseId, 10);

  try {
    const { rows } = await query(
      `SELECT c.*, u.name AS created_by_name
       FROM cases c
       LEFT JOIN users u ON u.id = c.created_by_user_id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [caseId, tenantId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Case não encontrado." });

    const c = rows[0];
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
        updatedAt: c.updated_at,
        createdByName: c.created_by_name
      }
    });
  } catch (err) {
    console.error("[cases/get]", err);
    return res.status(500).json({ error: "Erro ao buscar case." });
  }
});

// PATCH /cases/:caseId — editar detalhes (data_json) e/ou status
router.patch("/:caseId", requireAuth, async (req, res) => {
  const { tenantId, userId } = req.user;
  const caseId = parseInt(req.params.caseId, 10);
  const { data, status, patientPhase, roomPhase } = req.body || {};

  try {
    // Verificar se pertence ao tenant
    const { rows: existing } = await query(
      "SELECT id, data_json FROM cases WHERE id = $1 AND tenant_id = $2",
      [caseId, tenantId]
    );
    if (existing.length === 0) return res.status(404).json({ error: "Case não encontrado." });

    const sets = ["updated_at = NOW()"];
    const params = [];
    let idx = 1;

    if (data !== undefined) {
      // Mesclar com data_json existente
      const merged = Object.assign({}, existing[0].data_json || {}, data);
      sets.push("data_json = $" + idx++);
      params.push(JSON.stringify(merged));
    }
    if (status !== undefined) { sets.push("status = $" + idx++); params.push(status); }
    if (patientPhase !== undefined) { sets.push("patient_phase = $" + idx++); params.push(patientPhase); }
    if (roomPhase !== undefined) { sets.push("room_phase = $" + idx++); params.push(roomPhase); }

    params.push(caseId, tenantId);

    const { rows } = await query(
      "UPDATE cases SET " + sets.join(", ") + " WHERE id = $" + idx++ + " AND tenant_id = $" + idx + " RETURNING *",
      params
    );

    return res.json({
      case: {
        id: rows[0].id,
        roomId: rows[0].room_id,
        code: rows[0].code,
        status: rows[0].status,
        patientPhase: rows[0].patient_phase,
        roomPhase: rows[0].room_phase,
        data: rows[0].data_json,
        updatedAt: rows[0].updated_at
      }
    });
  } catch (err) {
    console.error("[cases/update]", err);
    return res.status(500).json({ error: "Erro ao atualizar case." });
  }
});

// GET /cases — listar todos os cases do tenant (para relatórios)
router.get("/", requireAuth, async (req, res) => {
  const { tenantId } = req.user;
  const { status, roomId } = req.query;

  try {
    let sql = `
      SELECT c.id, c.room_id, c.code, c.status, c.patient_phase, c.room_phase,
             c.data_json AS data, c.created_at, c.updated_at,
             u.name AS created_by_name, r.code AS room_code
      FROM cases c
      LEFT JOIN users u ON u.id = c.created_by_user_id
      LEFT JOIN rooms r ON r.id = c.room_id
      WHERE c.tenant_id = $1
    `;
    const params = [tenantId];
    let idx = 2;

    if (status) { sql += " AND c.status = $" + idx++; params.push(status); }
    if (roomId) { sql += " AND c.room_id = $" + idx++; params.push(parseInt(roomId, 10)); }

    sql += " ORDER BY c.created_at DESC";

    const { rows } = await query(sql, params);
    return res.json({ cases: rows });
  } catch (err) {
    console.error("[cases/list]", err);
    return res.status(500).json({ error: "Erro ao listar cases." });
  }
});

module.exports = router;
