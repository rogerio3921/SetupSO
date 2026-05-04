/**
 * Rota de importação do estado localStorage (migração MVP 2 → MVP 3).
 * POST /api/v1/import/localstorage
 *
 * Body: { "state": { "rooms": [...], "cases": [...], "eventsByCaseId": {...} } }
 */
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

router.post("/localstorage", async (req, res, next) => {
  try {
    const { state } = req.body;
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "Corpo inválido. Envie { state: { rooms, cases, eventsByCaseId } }." });
    }

    const { rooms = [], cases = [], eventsByCaseId = {} } = state;
    const userId = req.user.id;
    const stats = { rooms: 0, cases: 0, events: 0, skipped: 0 };

    // Mapa de id antigo (string) → id novo (integer) para rooms
    const roomIdMap = {};

    // ── Importar rooms ────────────────────────────────────────────────────────
    for (const room of rooms) {
      if (!room.code) continue;
      const existing = await db("rooms").where({ code: room.code }).first();
      if (existing) {
        roomIdMap[room.id] = existing.id;
        stats.skipped++;
        continue;
      }
      await db("rooms").insert({
        code: room.code,
        active: true,
        created_by_user_id: userId,
      });
      const inserted = await db("rooms").where({ code: room.code }).first();
      roomIdMap[room.id] = inserted.id;
      stats.rooms++;
    }

    // Mapa de id antigo (string uuid) → id novo (uuid) para cases
    const caseIdMap = {};

    // ── Importar cases ────────────────────────────────────────────────────────
    for (const c of cases) {
      if (!c.id || !c.roomId) continue;

      const existing = await db("cases").where({ code: c.code }).first();
      if (existing) {
        caseIdMap[c.id] = existing.id;
        stats.skipped++;
        continue;
      }

      const newRoomId = roomIdMap[c.roomId];
      if (!newRoomId) continue; // sala não foi importada, pular

      const d = c.data || {};
      const newId = uuidv4();
      await db("cases").insert({
        id: newId,
        room_id: newRoomId,
        code: c.code || "",
        status: c.status || "active",
        patient_phase: c.patientPhase || "open",
        room_phase: c.roomPhase || "open",
        full_name: d.fullName || "",
        notice_number: d.noticeNumber || "",
        procedure_name: d.procedureName || "",
        surgeon_name: d.surgeonName || "",
        attendance_number: d.attendanceNumber || "",
        birth_date: d.birthDate || null,
        allergies: d.allergies || "",
        weight_kg: d.weightKg || null,
        height_cm: d.heightCm || null,
        planned_surgery_time: d.plannedSurgeryTimeHHMM || "",
        reference_date: d.referenceDateISO || null,
        created_at: c.createdAt ? new Date(c.createdAt) : new Date(),
        created_by_user_id: userId,
      });
      caseIdMap[c.id] = newId;
      stats.cases++;
    }

    // ── Importar events ───────────────────────────────────────────────────────
    for (const [oldCaseId, events] of Object.entries(eventsByCaseId)) {
      const newCaseId = caseIdMap[oldCaseId];
      if (!newCaseId) continue;

      for (const ev of events) {
        if (!ev.eventKey || !ev.action) continue;

        const existing = await db("events")
          .where({ case_id: newCaseId, event_key: ev.eventKey, action: ev.action })
          .first();
        if (existing) { stats.skipped++; continue; }

        await db("events").insert({
          id: uuidv4(),
          case_id: newCaseId,
          event_key: ev.eventKey,
          action: ev.action,
          happened_at: ev.happenedAt ? new Date(ev.happenedAt) : new Date(),
          auto: !!ev.auto,
          created_at: ev.createdAt ? new Date(ev.createdAt) : new Date(),
          created_by_user_id: ev.auto ? null : userId,
        });
        stats.events++;
      }
    }

    return res.json({
      message: "Importação concluída.",
      imported: { rooms: stats.rooms, cases: stats.cases, events: stats.events },
      skipped: stats.skipped,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
