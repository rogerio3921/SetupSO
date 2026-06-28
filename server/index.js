"use strict";
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDb } = require("./db");

const PORT = parseInt(process.env.PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-troque-em-producao";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function nowISO() { return new Date().toISOString(); }
function pad2(n) { return String(n).padStart(2, "0"); }
function isoDate(d) {
  return String(d.getFullYear()) + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function generateCaseCode(roomCode, count) {
  return roomCode.replace(/\s+/g, "") + "-" + isoDate(new Date()) + "-" + pad2(count);
}

/* ------------------------------------------------------------------ */
/*  Middleware: JWT auth + tenant                                       */
/* ------------------------------------------------------------------ */
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token não fornecido." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  const tenantSlug =
    req.headers["x-tenant-slug"] ||
    req.body?.tenant ||
    req.query?.tenant ||
    req.user.tenantSlug;

  if (!tenantSlug) return res.status(400).json({ error: "Tenant não identificado." });

  const db = getDb();
  const tenant = db.prepare("SELECT * FROM tenants WHERE slug = ? AND active = 1").get(tenantSlug);
  if (!tenant) return res.status(403).json({ error: "Tenant não encontrado ou inativo." });

  if (tenant.id !== req.user.tenantId) {
    return res.status(403).json({ error: "Acesso negado a este tenant." });
  }

  req.tenant = tenant;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Requer perfil admin." });
  }
  next();
}

/* ------------------------------------------------------------------ */
/*  Auth routes                                                         */
/* ------------------------------------------------------------------ */
const authRouter = express.Router();

authRouter.post("/login", (req, res) => {
  const { tenant: tenantSlug, usernameOrCode, password } = req.body || {};

  if (!tenantSlug || !usernameOrCode || !password) {
    return res.status(400).json({ error: "Campos obrigatórios: tenant, usernameOrCode, password." });
  }

  const db = getDb();

  const tenant = db.prepare("SELECT * FROM tenants WHERE slug = ? AND active = 1").get(tenantSlug);
  if (!tenant) return res.status(401).json({ error: "Hospital não encontrado." });

  const user = db.prepare(
    "SELECT * FROM users WHERE tenant_id = ? AND (username = ? OR code = ?) AND active = 1"
  ).get(tenant.id, usernameOrCode, usernameOrCode);

  if (!user) return res.status(401).json({ error: "Usuário não encontrado." });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Senha incorreta." });

  const payload = {
    sub: user.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: user.role,
    name: user.name
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, username: user.username, code: user.code },
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
  });
});

authRouter.get("/me", authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id, name, username, code, role FROM users WHERE id = ?").get(req.user.sub);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  return res.json({ ...user, tenantId: req.tenant.id, tenantSlug: req.tenant.slug });
});

app.use("/api/auth", authRouter);

/* ------------------------------------------------------------------ */
/*  Rooms                                                               */
/* ------------------------------------------------------------------ */
const roomsRouter = express.Router();
roomsRouter.use(authMiddleware);

roomsRouter.get("/", (req, res) => {
  const db = getDb();
  const rooms = db.prepare("SELECT id, code FROM rooms WHERE tenant_id = ? AND active = 1 ORDER BY code").all(req.tenant.id);
  return res.json(rooms);
});

roomsRouter.post("/", adminOnly, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "Campo obrigatório: code." });
  const db = getDb();
  const result = db.prepare("INSERT INTO rooms (tenant_id, code) VALUES (?, ?)").run(req.tenant.id, code.trim());
  return res.status(201).json({ id: result.lastInsertRowid, code: code.trim() });
});

roomsRouter.get("/:roomId/active-case", (req, res) => {
  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE id = ? AND tenant_id = ?").get(req.params.roomId, req.tenant.id);
  if (!room) return res.status(404).json({ error: "Sala não encontrada." });

  const activeCase = db.prepare(
    "SELECT * FROM cases WHERE room_id = ? AND tenant_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
  ).get(room.id, req.tenant.id);

  if (!activeCase) return res.json({ case: null, events: [] });

  const events = db.prepare(
    "SELECT * FROM events WHERE case_id = ? AND tenant_id = ? ORDER BY happened_at ASC"
  ).all(activeCase.id, req.tenant.id);

  return res.json({ case: activeCase, events });
});

app.use("/api/rooms", roomsRouter);

/* ------------------------------------------------------------------ */
/*  Cases                                                               */
/* ------------------------------------------------------------------ */
const casesRouter = express.Router();
casesRouter.use(authMiddleware);

casesRouter.get("/", (req, res) => {
  const db = getDb();
  const cases = db.prepare(
    "SELECT * FROM cases WHERE tenant_id = ? ORDER BY created_at DESC"
  ).all(req.tenant.id);
  const result = cases.map(c => {
    const events = db.prepare(
      "SELECT * FROM events WHERE case_id = ? AND tenant_id = ? ORDER BY happened_at ASC"
    ).all(c.id, req.tenant.id);
    return { ...c, events };
  });
  return res.json(result);
});

casesRouter.post("/", (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: "Campo obrigatório: roomId." });

  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE id = ? AND tenant_id = ?").get(roomId, req.tenant.id);
  if (!room) return res.status(404).json({ error: "Sala não encontrada." });

  const existing = db.prepare(
    "SELECT id FROM cases WHERE room_id = ? AND tenant_id = ? AND status = 'active'"
  ).get(room.id, req.tenant.id);
  if (existing) {
    const events = db.prepare("SELECT * FROM events WHERE case_id = ? ORDER BY happened_at ASC").all(existing.id);
    const fullCase = db.prepare("SELECT * FROM cases WHERE id = ?").get(existing.id);
    return res.status(200).json({ case: fullCase, events, created: false });
  }

  const count = db.prepare("SELECT COUNT(*) as n FROM cases WHERE room_id = ? AND tenant_id = ?").get(room.id, req.tenant.id).n;
  const code = generateCaseCode(room.code, count + 1);

  const result = db.prepare(
    "INSERT INTO cases (tenant_id, room_id, code, created_by_user_id) VALUES (?, ?, ?, ?)"
  ).run(req.tenant.id, room.id, code, req.user.sub);

  const newCase = db.prepare("SELECT * FROM cases WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json({ case: newCase, events: [], created: true });
});

casesRouter.patch("/:caseId", (req, res) => {
  const db = getDb();
  const c = db.prepare("SELECT * FROM cases WHERE id = ? AND tenant_id = ?").get(req.params.caseId, req.tenant.id);
  if (!c) return res.status(404).json({ error: "Case não encontrado." });

  const { data, patientPhase, roomPhase, status } = req.body || {};
  const dataJson = data !== undefined ? JSON.stringify(data) : c.data_json;
  const pp = patientPhase || c.patient_phase;
  const rp = roomPhase || c.room_phase;
  const st = status || c.status;

  db.prepare(
    "UPDATE cases SET data_json = ?, patient_phase = ?, room_phase = ?, status = ? WHERE id = ? AND tenant_id = ?"
  ).run(dataJson, pp, rp, st, c.id, req.tenant.id);

  const updated = db.prepare("SELECT * FROM cases WHERE id = ?").get(c.id);
  return res.json({ case: updated });
});

casesRouter.get("/:caseId/events", (req, res) => {
  const db = getDb();
  const c = db.prepare("SELECT id FROM cases WHERE id = ? AND tenant_id = ?").get(req.params.caseId, req.tenant.id);
  if (!c) return res.status(404).json({ error: "Case não encontrado." });
  const events = db.prepare(
    "SELECT * FROM events WHERE case_id = ? AND tenant_id = ? ORDER BY happened_at ASC"
  ).all(c.id, req.tenant.id);
  return res.json(events);
});

casesRouter.post("/:caseId/events", (req, res) => {
  const db = getDb();
  const c = db.prepare("SELECT id FROM cases WHERE id = ? AND tenant_id = ?").get(req.params.caseId, req.tenant.id);
  if (!c) return res.status(404).json({ error: "Case não encontrado." });

  const { eventKey, action, happenedAt, auto } = req.body || {};
  if (!eventKey || !action) return res.status(400).json({ error: "Campos obrigatórios: eventKey, action." });

  const result = db.prepare(
    "INSERT INTO events (tenant_id, case_id, event_key, action, happened_at, auto, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(req.tenant.id, c.id, eventKey, action, happenedAt || nowISO(), auto ? 1 : 0, req.user.sub);

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(event);
});

app.use("/api/cases", casesRouter);

/* ------------------------------------------------------------------ */
/*  Events (undo/delete)                                                */
/* ------------------------------------------------------------------ */
const eventsRouter = express.Router();
eventsRouter.use(authMiddleware);

eventsRouter.delete("/:eventId", (req, res) => {
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND tenant_id = ?").get(req.params.eventId, req.tenant.id);
  if (!event) return res.status(404).json({ error: "Evento não encontrado." });
  db.prepare("DELETE FROM events WHERE id = ?").run(event.id);
  return res.json({ ok: true });
});

app.use("/api/events", eventsRouter);

/* ------------------------------------------------------------------ */
/*  Users (admin only)                                                  */
/* ------------------------------------------------------------------ */
const usersRouter = express.Router();
usersRouter.use(authMiddleware);
usersRouter.use(adminOnly);

usersRouter.get("/", (req, res) => {
  const db = getDb();
  const users = db.prepare(
    "SELECT id, name, username, code, role, active, created_at FROM users WHERE tenant_id = ? ORDER BY name"
  ).all(req.tenant.id);
  return res.json(users);
});

usersRouter.post("/", (req, res) => {
  const { name, username, code, password, role } = req.body || {};
  if (!name || !password) return res.status(400).json({ error: "Campos obrigatórios: name, password." });
  if (!username && !code) return res.status(400).json({ error: "Forneça username ou code (ou ambos)." });

  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  const userRole = ["admin", "colaborador"].includes(role) ? role : "colaborador";

  try {
    const result = db.prepare(
      "INSERT INTO users (tenant_id, name, username, code, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(req.tenant.id, name, username || null, code || null, hash, userRole);
    const user = db.prepare("SELECT id, name, username, code, role, active FROM users WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json(user);
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Username ou código já existe neste hospital." });
    }
    throw err;
  }
});

usersRouter.patch("/:userId", (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND tenant_id = ?").get(req.params.userId, req.tenant.id);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

  const { name, username, code, role, active, password } = req.body || {};
  const newName = name || user.name;
  const newUsername = username !== undefined ? (username || null) : user.username;
  const newCode = code !== undefined ? (code || null) : user.code;
  const newRole = ["admin", "colaborador"].includes(role) ? role : user.role;
  const newActive = active !== undefined ? (active ? 1 : 0) : user.active;
  const newHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;

  try {
    db.prepare(
      "UPDATE users SET name = ?, username = ?, code = ?, role = ?, active = ?, password_hash = ? WHERE id = ? AND tenant_id = ?"
    ).run(newName, newUsername, newCode, newRole, newActive, newHash, user.id, req.tenant.id);
    const updated = db.prepare("SELECT id, name, username, code, role, active FROM users WHERE id = ?").get(user.id);
    return res.json(updated);
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Username ou código já existe neste hospital." });
    }
    throw err;
  }
});

app.use("/api/users", usersRouter);

/* ------------------------------------------------------------------ */
/*  Tenants (super-admin / multi-hospital setup)                        */
/* ------------------------------------------------------------------ */
const tenantsRouter = express.Router();

tenantsRouter.post("/", (req, res) => {
  const { slug, name, adminName, adminUsername, adminCode, adminPassword } = req.body || {};
  if (!slug || !name || !adminName || !adminPassword) {
    return res.status(400).json({ error: "Campos obrigatórios: slug, name, adminName, adminPassword." });
  }
  if (!adminUsername && !adminCode) {
    return res.status(400).json({ error: "Forneça adminUsername ou adminCode para o admin inicial." });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug);
  if (existing) return res.status(409).json({ error: "Slug já em uso." });

  const createTenant = db.transaction(() => {
    const tenantResult = db.prepare("INSERT INTO tenants (slug, name) VALUES (?, ?)").run(slug, name);
    const tenantId = tenantResult.lastInsertRowid;

    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      "INSERT INTO users (tenant_id, name, username, code, password_hash, role) VALUES (?, ?, ?, ?, ?, 'admin')"
    ).run(tenantId, adminName, adminUsername || null, adminCode || null, hash);

    db.prepare("INSERT INTO rooms (tenant_id, code) VALUES (?, ?)").run(tenantId, "Sala 1");

    return tenantId;
  });

  const tenantId = createTenant();
  return res.status(201).json({ id: tenantId, slug, name });
});

app.use("/api/tenants", tenantsRouter);

/* ------------------------------------------------------------------ */
/*  SPA fallback                                                        */
/* ------------------------------------------------------------------ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

/* ------------------------------------------------------------------ */
/*  Start                                                               */
/* ------------------------------------------------------------------ */
getDb(); // initialize DB on startup
app.listen(PORT, () => {
  console.log("SetupSO rodando em http://localhost:" + PORT);
  console.log("Tenant demo: slug=demo, admin=admin/admin123, colaborador=joao.silva/senha123 (cód JS01)");
});
