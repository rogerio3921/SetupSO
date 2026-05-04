// server/index.js — SetupSO API
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "changeme-dev-secret";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

/* ─── Auth middleware ─────────────────────────────────────── */
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* Resolve tenant from X-Tenant header (after auth middleware) */
async function tenantMiddleware(req, res, next) {
  const slug = req.headers["x-tenant"] || req.user.tenantSlug;
  if (!slug) return res.status(400).json({ error: "Missing X-Tenant header" });

  // Enforce: user can only access their own tenant
  if (slug !== req.user.tenantSlug) {
    return res.status(403).json({ error: "Forbidden: tenant mismatch" });
  }

  const { rows } = await pool.query("SELECT id FROM tenants WHERE slug=$1", [slug]);
  if (!rows.length) return res.status(404).json({ error: "Tenant not found" });

  req.tenantId = rows[0].id;
  next();
}

/* ─── POST /auth/login ─────────────────────────────────────── */
app.post("/auth/login", async (req, res) => {
  try {
    const { hospital, usernameOrCode, password } = req.body || {};
    if (!hospital || !usernameOrCode || !password) {
      return res.status(400).json({ error: "hospital, usernameOrCode and password are required" });
    }

    // Normalise hospital slug: lowercase, trim, spaces → hyphens
    const slug = hospital.trim().toLowerCase().replace(/\s+/g, "-");

    const tenantRes = await pool.query("SELECT id FROM tenants WHERE slug=$1", [slug]);
    if (!tenantRes.rows.length) {
      return res.status(401).json({ error: "Hospital não encontrado. Verifique o código e tente novamente." });
    }
    const tenantId = tenantRes.rows[0].id;

    const userRes = await pool.query(
      `SELECT id, username, code, password_hash, role, active
       FROM users
       WHERE tenant_id=$1 AND (username=$2 OR code=$2)`,
      [tenantId, usernameOrCode.trim()]
    );
    if (!userRes.rows.length) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }
    const user = userRes.rows[0];

    if (!user.active) {
      return res.status(401).json({ error: "Usuário inativo. Contate o administrador." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const token = jwt.sign(
      { userId: user.id, tenantId, tenantSlug: slug, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, code: user.code, role: user.role },
      tenantSlug: slug
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── GET /auth/me ─────────────────────────────────────────── */
app.get("/auth/me", authMiddleware, (req, res) => {
  res.json({
    userId: req.user.userId,
    tenantSlug: req.user.tenantSlug,
    role: req.user.role,
    username: req.user.username
  });
});

/* ─── All /api/* routes require auth + tenant ──────────────── */
app.use("/api", authMiddleware, tenantMiddleware);

/* ─── GET /api/rooms ───────────────────────────────────────── */
app.get("/api/rooms", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, code FROM rooms WHERE tenant_id=$1 ORDER BY id",
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── GET /api/rooms/:roomId/active-case ───────────────────── */
app.get("/api/rooms/:roomId/active-case", async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verify room belongs to tenant
    const roomRes = await pool.query(
      "SELECT id, code FROM rooms WHERE id=$1 AND tenant_id=$2",
      [roomId, req.tenantId]
    );
    if (!roomRes.rows.length) return res.status(404).json({ error: "Room not found" });
    const room = roomRes.rows[0];

    // Find existing active case
    const caseRes = await pool.query(
      `SELECT id, code, status, patient_phase, room_phase, data, created_by_user_id, created_at
       FROM cases
       WHERE room_id=$1 AND tenant_id=$2 AND status='active'
       ORDER BY created_at DESC LIMIT 1`,
      [roomId, req.tenantId]
    );

    if (caseRes.rows.length) {
      const c = caseRes.rows[0];
      return res.json({
        id: c.id,
        roomId: String(roomId),
        code: c.code,
        status: c.status,
        patientPhase: c.patient_phase,
        roomPhase: c.room_phase,
        data: c.data,
        createdAt: c.created_at
      });
    }

    // Create new active case
    const today = new Date();
    const pad = n => String(n).padStart(2, "0");
    const dateStr = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());

    const countRes = await pool.query(
      "SELECT COUNT(*) FROM cases WHERE room_id=$1 AND tenant_id=$2",
      [roomId, req.tenantId]
    );
    const count = parseInt(countRes.rows[0].count, 10) + 1;
    const caseCode = room.code.replace(/\s+/g, "") + "-" + dateStr + "-" + pad(count);
    const caseId = Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

    await pool.query(
      `INSERT INTO cases (id, tenant_id, room_id, code, status, patient_phase, room_phase, data, created_by_user_id)
       VALUES ($1, $2, $3, $4, 'active', 'open', 'open', '{}', $5)`,
      [caseId, req.tenantId, roomId, caseCode, req.user.userId]
    );

    res.status(201).json({
      id: caseId,
      roomId: String(roomId),
      code: caseCode,
      status: "active",
      patientPhase: "open",
      roomPhase: "open",
      data: {},
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── PATCH /api/cases/:caseId ─────────────────────────────── */
app.patch("/api/cases/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { data, status, patientPhase, roomPhase } = req.body || {};

    const caseRes = await pool.query(
      "SELECT id FROM cases WHERE id=$1 AND tenant_id=$2",
      [caseId, req.tenantId]
    );
    if (!caseRes.rows.length) return res.status(404).json({ error: "Case not found" });

    const updates = [];
    const values = [caseId, req.tenantId, req.user.userId];
    let idx = 4;

    if (data !== undefined) { updates.push("data=$" + idx++); values.push(JSON.stringify(data)); }
    if (status !== undefined) { updates.push("status=$" + idx++); values.push(status); }
    if (patientPhase !== undefined) { updates.push("patient_phase=$" + idx++); values.push(patientPhase); }
    if (roomPhase !== undefined) { updates.push("room_phase=$" + idx++); values.push(roomPhase); }

    if (updates.length === 0) return res.json({ ok: true });

    updates.push("updated_at=NOW()", "updated_by_user_id=$3");

    await pool.query(
      `UPDATE cases SET ${updates.join(", ")} WHERE id=$1 AND tenant_id=$2`,
      values
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── GET /api/cases/:caseId/events ────────────────────────── */
app.get("/api/cases/:caseId/events", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, event_key, action, happened_at, auto, created_by_user_id, created_at
       FROM events
       WHERE case_id=$1 AND tenant_id=$2
       ORDER BY happened_at ASC`,
      [caseId, req.tenantId]
    );
    res.json(rows.map(r => ({
      id: r.id,
      eventKey: r.event_key,
      action: r.action,
      happenedAt: r.happened_at,
      auto: r.auto,
      createdByUserId: r.created_by_user_id,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── POST /api/cases/:caseId/events ───────────────────────── */
app.post("/api/cases/:caseId/events", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { eventKey, action, auto, happenedAt } = req.body || {};

    if (!eventKey || !action) {
      return res.status(400).json({ error: "eventKey and action are required" });
    }

    // Verify case belongs to tenant
    const caseRes = await pool.query(
      "SELECT id FROM cases WHERE id=$1 AND tenant_id=$2",
      [caseId, req.tenantId]
    );
    if (!caseRes.rows.length) return res.status(404).json({ error: "Case not found" });

    const eventId = Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
    const ts = happenedAt ? new Date(happenedAt) : new Date();

    await pool.query(
      `INSERT INTO events (id, tenant_id, case_id, event_key, action, happened_at, auto, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [eventId, req.tenantId, caseId, eventKey, action, ts, !!auto, req.user.userId]
    );

    res.status(201).json({
      id: eventId,
      eventKey,
      action,
      happenedAt: ts.toISOString(),
      auto: !!auto,
      createdByUserId: req.user.userId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── DELETE /api/cases/:caseId/events/:eventId ────────────── */
app.delete("/api/cases/:caseId/events/:eventId", async (req, res) => {
  try {
    const { caseId, eventId } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM events WHERE id=$1 AND case_id=$2 AND tenant_id=$3 AND auto=FALSE`,
      [eventId, caseId, req.tenantId]
    );

    if (!rowCount) return res.status(404).json({ error: "Event not found or is auto-generated" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── Admin: GET /api/admin/users ──────────────────────────── */
app.get("/api/admin/users", async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { rows } = await pool.query(
      "SELECT id, username, code, role, active, created_at FROM users WHERE tenant_id=$1 ORDER BY id",
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── Admin: POST /api/admin/users ─────────────────────────── */
app.post("/api/admin/users", async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { username, code, password, role } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username and password required" });

    const validRole = role === "admin" ? "admin" : "collaborator";
    const hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (tenant_id, username, code, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, code, role, active`,
      [req.tenantId, username, code || null, hash, validRole]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Username already exists" });
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── Admin: PATCH /api/admin/users/:id ────────────────────── */
app.patch("/api/admin/users/:id", async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { id } = req.params;
    const { password, role, active } = req.body || {};

    const updates = [];
    const values = [id, req.tenantId];
    let idx = 3;

    if (password !== undefined) {
      const hash = await bcrypt.hash(password, 10);
      updates.push("password_hash=$" + idx++);
      values.push(hash);
    }
    if (role !== undefined) {
      updates.push("role=$" + idx++);
      values.push(role === "admin" ? "admin" : "collaborator");
    }
    if (active !== undefined) {
      updates.push("active=$" + idx++);
      values.push(!!active);
    }

    if (updates.length === 0) return res.json({ ok: true });

    const { rowCount } = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id=$1 AND tenant_id=$2`,
      values
    );

    if (!rowCount) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ─── Fallback to frontend SPA ──────────────────────────────── */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

/* ─── Start ─────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log("SetupSO API listening on http://localhost:" + PORT);
});
