/**
 * Rotas de salas.
 * GET   /api/v1/rooms
 * POST  /api/v1/rooms  (admin only)
 * GET   /api/v1/rooms/:roomId/active-case
 */
const router = require("express").Router();
const { requireRole } = require("../middleware/auth");
const db = require("../db");

// GET /rooms
router.get("/", async (req, res, next) => {
  try {
    const rooms = await db("rooms").where({ active: true }).orderBy("code");
    return res.json(rooms);
  } catch (err) {
    next(err);
  }
});

// POST /rooms — admin only
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code é obrigatório." });

    const exists = await db("rooms").where({ code }).first();
    if (exists) return res.status(409).json({ error: "Sala já cadastrada." });

    await db("rooms").insert({
      code,
      active: true,
      created_by_user_id: req.user.id,
    });

    const created = await db("rooms").where({ code }).select("id", "code").first();
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// GET /rooms/:roomId/active-case
router.get("/:roomId/active-case", async (req, res, next) => {
  try {
    const roomId = parseInt(req.params.roomId, 10);

    const activeCase = await db("cases")
      .where({ room_id: roomId, status: "active" })
      .orderBy("created_at", "desc")
      .first();

    if (!activeCase) {
      return res.json(null);
    }

    return res.json(caseToApi(activeCase));
  } catch (err) {
    next(err);
  }
});

function caseToApi(c) {
  return {
    id: c.id,
    roomId: c.room_id,
    code: c.code,
    status: c.status,
    patientPhase: c.patient_phase,
    roomPhase: c.room_phase,
    data: {
      fullName: c.full_name || "",
      noticeNumber: c.notice_number || "",
      procedureName: c.procedure_name || "",
      surgeonName: c.surgeon_name || "",
      attendanceNumber: c.attendance_number || "",
      birthDate: c.birth_date || "",
      allergies: c.allergies || "",
      weightKg: c.weight_kg || "",
      heightCm: c.height_cm || "",
      plannedSurgeryTimeHHMM: c.planned_surgery_time || "",
      referenceDateISO: c.reference_date || "",
    },
    createdAt: c.created_at,
    createdByUserId: c.created_by_user_id,
  };
}

module.exports = router;
module.exports.caseToApi = caseToApi;
