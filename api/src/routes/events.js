/**
 * Rotas de eventos.
 * GET  /api/v1/cases/:caseId/events
 * POST /api/v1/cases/:caseId/events
 */
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const VALID_ACTIONS = ["in", "out", "start", "end"];
const VALID_EVENT_KEYS = [
  "anesthesia_team", "surgical_team", "transport_patient", "admission_cc",
  "patient_in_or", "anesthesia", "positioning", "time_out", "surgery",
  "cme", "cleaning", "pharmacy", "clinical_engineering", "rpa", "room_setup",
];

// GET /cases/:caseId/events
router.get("/:caseId/events", async (req, res, next) => {
  try {
    const events = await db("events")
      .leftJoin("users", "events.created_by_user_id", "users.id")
      .where({ "events.case_id": req.params.caseId })
      .orderBy("events.happened_at", "asc")
      .select(
        "events.id",
        "events.case_id as caseId",
        "events.event_key as eventKey",
        "events.action",
        "events.happened_at as happenedAt",
        "events.auto",
        "events.created_at as createdAt",
        "events.created_by_user_id as createdByUserId",
        "users.name as createdByName"
      );

    return res.json(events);
  } catch (err) {
    next(err);
  }
});

// POST /cases/:caseId/events
router.post("/:caseId/events", async (req, res, next) => {
  try {
    const { eventKey, action, auto } = req.body;

    if (!eventKey || !VALID_EVENT_KEYS.includes(eventKey)) {
      return res.status(400).json({ error: "eventKey inválido." });
    }
    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: "action inválida. Use: in, out, start, end." });
    }

    const caseObj = await db("cases").where({ id: req.params.caseId }).first();
    if (!caseObj) return res.status(404).json({ error: "Caso não encontrado." });
    if (caseObj.status === "closed") {
      return res.status(409).json({ error: "Não é possível adicionar eventos a um caso fechado." });
    }

    const id = uuidv4();
    const now = new Date();
    await db("events").insert({
      id,
      case_id: req.params.caseId,
      event_key: eventKey,
      action,
      happened_at: now,
      auto: !!auto,
      created_at: now,
      created_by_user_id: auto ? null : req.user.id,
    });

    const event = await db("events").where({ id }).first();
    return res.status(201).json({
      id: event.id,
      caseId: event.case_id,
      eventKey: event.event_key,
      action: event.action,
      happenedAt: event.happened_at,
      auto: event.auto,
      createdByUserId: event.created_by_user_id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
