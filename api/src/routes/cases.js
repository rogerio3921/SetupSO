/**
 * Rotas de casos cirúrgicos.
 * POST  /api/v1/cases
 * PATCH /api/v1/cases/:id
 */
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { requireRole } = require("../middleware/auth");
const db = require("../db");
const { caseToApi } = require("./rooms");

// POST /cases — cria novo caso (abre sala)
router.post("/", async (req, res, next) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId é obrigatório." });

    const room = await db("rooms").where({ id: roomId, active: true }).first();
    if (!room) return res.status(404).json({ error: "Sala não encontrada." });

    // Contar casos da sala para gerar código
    const count = await db("cases").where({ room_id: roomId }).count("id as cnt").first();
    const seq = String(parseInt((count && count.cnt) || 0, 10) + 1).padStart(2, "0");
    const today = new Date().toISOString().slice(0, 10);
    const code = room.code.replace(/\s/g, "") + "-" + today + "-" + seq;

    const id = uuidv4();
    await db("cases").insert({
      id,
      room_id: roomId,
      code,
      status: "active",
      patient_phase: "open",
      room_phase: "open",
      created_by_user_id: req.user.id,
      reference_date: today,
    });

    const newCase = await db("cases").where({ id }).first();
    return res.status(201).json(caseToApi(newCase));
  } catch (err) {
    next(err);
  }
});

// PATCH /cases/:id — atualiza dados ou status
router.patch("/:id", async (req, res, next) => {
  try {
    const caseObj = await db("cases").where({ id: req.params.id }).first();
    if (!caseObj) return res.status(404).json({ error: "Caso não encontrado." });

    const updates = { updated_at: new Date(), updated_by_user_id: req.user.id };

    // Atualizar status (apenas admin pode reabrir caso fechado)
    if (req.body.status !== undefined) {
      if (req.body.status === "active" && caseObj.status === "closed") {
        if (req.user.role !== "admin") {
          return res.status(403).json({ error: "Apenas admins podem reabrir casos." });
        }
      }
      updates.status = req.body.status;
    }

    // Atualizar phases
    if (req.body.patientPhase !== undefined) updates.patient_phase = req.body.patientPhase;
    if (req.body.roomPhase !== undefined) updates.room_phase = req.body.roomPhase;

    // Atualizar dados do paciente
    const d = req.body.data || {};
    if (d.fullName !== undefined) updates.full_name = d.fullName;
    if (d.noticeNumber !== undefined) updates.notice_number = d.noticeNumber;
    if (d.procedureName !== undefined) updates.procedure_name = d.procedureName;
    if (d.surgeonName !== undefined) updates.surgeon_name = d.surgeonName;
    if (d.attendanceNumber !== undefined) updates.attendance_number = d.attendanceNumber;
    if (d.birthDate !== undefined) updates.birth_date = d.birthDate || null;
    if (d.allergies !== undefined) updates.allergies = d.allergies;
    if (d.weightKg !== undefined) updates.weight_kg = d.weightKg || null;
    if (d.heightCm !== undefined) updates.height_cm = d.heightCm || null;
    if (d.plannedSurgeryTimeHHMM !== undefined) updates.planned_surgery_time = d.plannedSurgeryTimeHHMM;
    if (d.referenceDateISO !== undefined) updates.reference_date = d.referenceDateISO || null;

    await db("cases").where({ id: req.params.id }).update(updates);

    const updated = await db("cases").where({ id: req.params.id }).first();
    return res.json(caseToApi(updated));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
