/**
 * SetupSO — API server (MVP Online)
 * Start:  npm start          (NODE_ENV=production)
 *         npm run dev        (NODE_ENV=development)
 *
 * Tenant resolution strategy:
 *   - Development (NODE_ENV !== 'production'):
 *       If the tenant slug does not exist it is created on-demand.
 *   - Production:
 *       The tenant MUST exist (pre-created by an admin). Login returns
 *       HTTP 404 with a clear message so the operator knows to create it.
 *
 * Hospital slug format: lowercase letters, digits and hyphens only.
 * Example: "hospital-central", "hc-rio", "abc123"
 */
"use strict";

const path    = require("path");
const http    = require("http");
const express = require("express");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const { openDb, migrate } = require("./db");

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT      = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "setupso-dev-secret-change-in-production";
const JWT_EXPIRES = "8h";
const IS_DEV    = process.env.NODE_ENV !== "production";
const SALT_ROUNDS = 10;

// Tenant slug: only lowercase ascii letters, digits and hyphens; 2-64 chars
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/;

// ─── DB ──────────────────────────────────────────────────────────────────────
const db = openDb();
migrate(db);

// ─── Prepared statements ─────────────────────────────────────────────────────
const stmts = {
  getTenant:    db.prepare("SELECT * FROM tenants WHERE slug = ?"),
  createTenant: db.prepare("INSERT INTO tenants (slug, name) VALUES (?, ?) RETURNING *"),
  // user lookup: by username OR code within the same tenant
  getUser: db.prepare(
    "SELECT * FROM users WHERE tenant_id = ? AND active = 1 AND (username = ? OR (code IS NOT NULL AND code = ?))"
  ),
  getUserById: db.prepare("SELECT * FROM users WHERE id = ?"),
  createUser:  db.prepare(
    "INSERT INTO users (tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?) RETURNING *"
  ),
  // rooms
  getRooms:    db.prepare("SELECT * FROM rooms WHERE tenant_id = ? ORDER BY code"),
  getRoom:     db.prepare("SELECT * FROM rooms WHERE id = ? AND tenant_id = ?"),
  // cases
  getActiveCase: db.prepare(
    "SELECT * FROM cases WHERE room_id = ? AND tenant_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
  ),
  createCase: db.prepare(
    "INSERT INTO cases (room_id, tenant_id, data_json, created_by) VALUES (?, ?, ?, ?) RETURNING *"
  ),
  updateCaseData: db.prepare("UPDATE cases SET data_json = ? WHERE id = ? AND tenant_id = ?"),
  closeCase: db.prepare("UPDATE cases SET status = 'closed' WHERE id = ? AND tenant_id = ?"),
  // events
  getEvents: db.prepare(
    "SELECT * FROM events WHERE case_id = ? AND tenant_id = ? ORDER BY happened_at ASC"
  ),
  addEvent: db.prepare(
    "INSERT INTO events (case_id, tenant_id, event_key, action, happened_at, auto, created_by) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *"
  ),
  deleteLastManualEvent: db.prepare(`
    DELETE FROM events WHERE id = (
      SELECT id FROM events
      WHERE case_id = ? AND tenant_id = ? AND auto = 0
      ORDER BY happened_at DESC LIMIT 1
    )
  `),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(raw) {
  return String(raw || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function resolveTenant(slug) {
  let tenant = stmts.getTenant.get(slug);
  if (!tenant) {
    if (IS_DEV) {
      // on-demand creation — MVP convenience for development
      tenant = stmts.createTenant.get(slug, slug);
      console.log("[tenant] created on-demand (dev):", slug);
    } else {
      return null; // caller must return 404
    }
  }
  return tenant;
}

function signToken(user, tenant) {
  return jwt.sign(
    { sub: user.id, tenantId: tenant.id, tenantSlug: tenant.slug, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token ausente." });
  try {
    req.claims = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  // Tenant can be overridden via header (must match the token's tenant)
  const headerSlug = req.headers["x-tenant"];
  if (headerSlug && headerSlug !== req.claims.tenantSlug) {
    return res.status(403).json({ error: "Tenant do header não corresponde ao token." });
  }

  req.tenantId   = req.claims.tenantId;
  req.tenantSlug = req.claims.tenantSlug;
  req.userId     = req.claims.sub;
  req.userRole   = req.claims.role;
  next();
}

function requireAdmin(req, res, next) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a administradores." });
  }
  next();
}

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// ── Auth ─────────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Body: { hospital, identifier, password }
 *   hospital   – tenant slug (e.g. "hospital-central"); trimmed and lowercased server-side
 *   identifier – username OR user code
 *   password   – plain text (hashed with bcrypt)
 */
app.post("/auth/login", async (req, res) => {
  const rawSlug  = String(req.body.hospital   || "").trim();
  const rawIdent = String(req.body.identifier || "").trim();
  const rawPass  = String(req.body.password   || "");

  // ── Validate slug ─────────────────────────────────────────────────────────
  const slug = slugify(rawSlug);
  if (!slug || !SLUG_RE.test(slug)) {
    return res.status(422).json({
      error: "Identificador do hospital inválido. Use letras minúsculas, números e hífens (ex: hospital-central).",
      field: "hospital"
    });
  }

  if (!rawIdent) {
    return res.status(422).json({ error: "Informe o usuário ou código.", field: "identifier" });
  }
  if (!rawPass) {
    return res.status(422).json({ error: "Informe a senha.", field: "password" });
  }

  // ── Resolve tenant ────────────────────────────────────────────────────────
  const tenant = resolveTenant(slug);
  if (!tenant) {
    return res.status(404).json({
      error: IS_DEV
        ? "Hospital não encontrado. Em dev seria criado automaticamente; verifique o slug."
        : "Hospital não encontrado. Solicite ao administrador do sistema que cadastre o hospital \"" + slug + "\" antes do primeiro acesso.",
      field: "hospital"
    });
  }

  // ── Find user (by username OR code) ───────────────────────────────────────
  const user = stmts.getUser.get(tenant.id, rawIdent, rawIdent);
  if (!user) {
    return res.status(401).json({ error: "Usuário/código ou senha incorretos." });
  }

  // ── Verify password ───────────────────────────────────────────────────────
  const ok = await bcrypt.compare(rawPass, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Usuário/código ou senha incorretos." });
  }

  const token = signToken(user, tenant);
  return res.json({
    token,
    user: { id: user.id, username: user.username, code: user.code, role: user.role },
    tenant: { slug: tenant.slug, name: tenant.name }
  });
});

/**
 * GET /auth/me — returns current user info
 */
app.get("/auth/me", authMiddleware, (req, res) => {
  const user   = stmts.getUserById.get(req.userId);
  const tenant = stmts.getTenant.get(req.tenantSlug);
  if (!user || !tenant) return res.status(404).json({ error: "Não encontrado." });
  return res.json({
    user:   { id: user.id, username: user.username, code: user.code, role: user.role },
    tenant: { slug: tenant.slug, name: tenant.name }
  });
});

// ── Admin: user management ───────────────────────────────────────────────────

/**
 * POST /admin/users — create a user in the current tenant
 * Body: { username, password, code?, role? }
 */
app.post("/admin/users", authMiddleware, requireAdmin, async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const code     = req.body.code ? String(req.body.code).trim() : null;
  const role     = req.body.role === "admin" ? "admin" : "colaborador";

  if (!username) return res.status(422).json({ error: "username é obrigatório." });
  if (!password) return res.status(422).json({ error: "password é obrigatório." });

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const user = stmts.createUser.get(req.tenantId, username, hash, role);
    if (code) {
      db.prepare("UPDATE users SET code = ? WHERE id = ?").run(code, user.id);
    }
    return res.status(201).json({ id: user.id, username: user.username, role: user.role });
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Usuário já existe neste hospital." });
    }
    throw e;
  }
});

/**
 * POST /admin/tenants — create a tenant (admin of any tenant can call this in dev;
 * in production only a super-admin token with tenantSlug='_root' may call it — scope
 * for future hardening, skipped in MVP).
 */
app.post("/admin/tenants", authMiddleware, requireAdmin, (req, res) => {
  const rawSlug = String(req.body.slug || "").trim();
  const name    = String(req.body.name || rawSlug).trim();
  const slug    = slugify(rawSlug);
  if (!slug || !SLUG_RE.test(slug)) {
    return res.status(422).json({
      error: "Slug inválido. Use letras minúsculas, números e hífens.",
      field: "slug"
    });
  }
  try {
    const tenant = stmts.createTenant.get(slug, name || slug);
    return res.status(201).json({ id: tenant.id, slug: tenant.slug, name: tenant.name });
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Hospital já existe." });
    }
    throw e;
  }
});

// ── Rooms ────────────────────────────────────────────────────────────────────

app.get("/api/rooms", authMiddleware, (req, res) => {
  const rooms = stmts.getRooms.all(req.tenantId);
  return res.json(rooms);
});

// ── Cases ────────────────────────────────────────────────────────────────────

app.get("/api/rooms/:roomId/active-case", authMiddleware, (req, res) => {
  const room = stmts.getRoom.get(Number(req.params.roomId), req.tenantId);
  if (!room) return res.status(404).json({ error: "Sala não encontrada." });
  let c = stmts.getActiveCase.get(room.id, req.tenantId);
  if (!c) {
    c = stmts.createCase.get(room.id, req.tenantId, "{}", req.userId);
  }
  return res.json({ ...c, data: JSON.parse(c.data_json || "{}") });
});

app.patch("/api/cases/:caseId", authMiddleware, (req, res) => {
  const data = req.body.data;
  if (typeof data !== "object" || data === null) {
    return res.status(422).json({ error: "Campo 'data' deve ser um objeto." });
  }
  stmts.updateCaseData.run(JSON.stringify(data), Number(req.params.caseId), req.tenantId);
  return res.json({ ok: true });
});

app.post("/api/cases/:caseId/close", authMiddleware, (req, res) => {
  stmts.closeCase.run(Number(req.params.caseId), req.tenantId);
  return res.json({ ok: true });
});

// ── Events ───────────────────────────────────────────────────────────────────

app.get("/api/cases/:caseId/events", authMiddleware, (req, res) => {
  const events = stmts.getEvents.all(Number(req.params.caseId), req.tenantId);
  return res.json(events);
});

app.post("/api/cases/:caseId/events", authMiddleware, (req, res) => {
  const { event_key, action, happened_at, auto } = req.body;
  if (!event_key || !action || !happened_at) {
    return res.status(422).json({ error: "event_key, action e happened_at são obrigatórios." });
  }
  const ev = stmts.addEvent.get(
    Number(req.params.caseId), req.tenantId,
    event_key, action, happened_at,
    auto ? 1 : 0, req.userId
  );
  return res.status(201).json(ev);
});

app.delete("/api/cases/:caseId/events/last-manual", authMiddleware, (req, res) => {
  stmts.deleteLastManualEvent.run(Number(req.params.caseId), req.tenantId);
  return res.json({ ok: true });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log("[server] SetupSO MVP Online —", IS_DEV ? "DEV" : "PRODUCTION");
  console.log("[server] Listening on http://localhost:" + PORT);
  console.log("[server] Tenant creation on-demand:", IS_DEV ? "ENABLED (dev)" : "DISABLED (production)");
});

module.exports = { app, db };
