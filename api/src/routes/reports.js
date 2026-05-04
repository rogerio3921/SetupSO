/**
 * Rotas de relatórios.
 * GET /api/v1/reports/cases?from=YYYY-MM-DD&to=YYYY-MM-DD&roomId=
 */
const router = require("express").Router();
const db = require("../db");

// GET /reports/cases
router.get("/cases", async (req, res, next) => {
  try {
    const { from, to, roomId } = req.query;

    let query = db("cases")
      .leftJoin("rooms", "cases.room_id", "rooms.id")
      .leftJoin("users", "cases.created_by_user_id", "users.id")
      .select(
        "cases.id",
        "cases.code",
        "rooms.code as roomCode",
        "cases.status",
        "cases.full_name as patientName",
        "cases.procedure_name as procedureName",
        "cases.surgeon_name as surgeonName",
        "cases.created_at as createdAt",
        "users.name as createdByName"
      )
      .orderBy("cases.created_at", "desc");

    if (from) query = query.where("cases.created_at", ">=", new Date(from + "T00:00:00Z"));
    if (to) query = query.where("cases.created_at", "<=", new Date(to + "T23:59:59Z"));
    if (roomId) query = query.where("cases.room_id", roomId);

    const cases = await query;

    // Para cada caso, buscar eventos e calcular métricas
    const result = await Promise.all(cases.map(async (c) => {
      const events = await db("events")
        .where({ case_id: c.id })
        .orderBy("happened_at", "asc")
        .select("event_key", "action", "happened_at", "auto");

      return {
        ...c,
        metrics: computeMetrics(events),
      };
    }));

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

function findFirst(events, eventKey, action) {
  const ev = events.find((e) => e.event_key === eventKey && e.action === action);
  return ev ? new Date(ev.happened_at) : null;
}

function spanMs(start, end) {
  if (!start) return null;
  return ((end || new Date()).getTime()) - start.getTime();
}

function computeMetrics(events) {
  return {
    orTimeMs: spanMs(
      findFirst(events, "patient_in_or", "in"),
      findFirst(events, "patient_in_or", "out")
    ),
    surgeryTimeMs: spanMs(
      findFirst(events, "surgery", "start"),
      findFirst(events, "surgery", "end")
    ),
    anesthesiaTimeMs: spanMs(
      findFirst(events, "anesthesia", "start"),
      findFirst(events, "anesthesia", "end")
    ),
    rpaTimeMs: spanMs(
      findFirst(events, "rpa", "in"),
      findFirst(events, "rpa", "out")
    ),
    totalCcMs: spanMs(
      findFirst(events, "transport_patient", "start"),
      findFirst(events, "rpa", "out")
    ),
  };
}

module.exports = router;
