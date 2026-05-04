// server/db.js — Conexão PostgreSQL + migrations do schema
// SetupSO MVP online — multi-hospital (multi-tenant)

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Schema SQL ─────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
-- Hospitais / tenants
CREATE TABLE IF NOT EXISTS tenants (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuários
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username        TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin','collaborator')),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, username)
);

-- Salas cirúrgicas (por tenant)
CREATE TABLE IF NOT EXISTS rooms (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cases (procedimentos/cirurgias)
CREATE TABLE IF NOT EXISTS cases (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id               INTEGER NOT NULL REFERENCES rooms(id),
  code                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  patient_phase         TEXT NOT NULL DEFAULT 'open',
  room_phase            TEXT NOT NULL DEFAULT 'open',
  data_json             JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id    INTEGER REFERENCES users(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eventos (etapas registradas)
CREATE TABLE IF NOT EXISTS events (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id             INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_key           TEXT NOT NULL,
  action              TEXT NOT NULL,
  happened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id  INTEGER REFERENCES users(id)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_cases_tenant_room ON cases(tenant_id, room_id);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_status ON cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_events_case ON events(case_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
`;

// ─── Migrate ────────────────────────────────────────────────────────────────

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    console.log("[db] Schema aplicado com sucesso.");
  } finally {
    client.release();
  }
}

// ─── Bootstrap admin ────────────────────────────────────────────────────────

async function bootstrapAdmin() {
  const bcrypt = require("bcrypt");

  const tenantSlug = "default";
  const adminUsername = process.env.BOOTSTRAP_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || "admin123";

  // Verificar se já existe algum tenant
  const { rows: tenants } = await pool.query(
    "SELECT id FROM tenants WHERE slug = $1",
    [tenantSlug]
  );

  let tenantId;
  if (tenants.length === 0) {
    const { rows } = await pool.query(
      "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id",
      ["Hospital Padrão", tenantSlug]
    );
    tenantId = rows[0].id;
    console.log("[db] Tenant padrão criado (id=" + tenantId + ").");
  } else {
    tenantId = tenants[0].id;
  }

  // Verificar se já existe admin
  const { rows: admins } = await pool.query(
    "SELECT id FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1",
    [tenantId]
  );
  if (admins.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      "INSERT INTO users (tenant_id, username, password_hash, name, role) VALUES ($1,$2,$3,$4,'admin')",
      [tenantId, adminUsername, hash, "Administrador"]
    );
    console.log("[db] Usuário admin padrão criado.");
  }

  // Criar sala padrão se não existir
  const { rows: rooms } = await pool.query(
    "SELECT id FROM rooms WHERE tenant_id = $1 LIMIT 1",
    [tenantId]
  );
  if (rooms.length === 0) {
    await pool.query(
      "INSERT INTO rooms (tenant_id, code) VALUES ($1, $2)",
      [tenantId, "Sala 1"]
    );
    console.log("[db] Sala padrão criada.");
  }
}

// ─── Query helper ────────────────────────────────────────────────────────────

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query, migrate, bootstrapAdmin };

// Executar migrate diretamente: node server/db.js
if (require.main === module) {
  migrate()
    .then(bootstrapAdmin)
    .then(() => { console.log("[db] Pronto."); process.exit(0); })
    .catch((err) => { console.error("[db] Erro:", err); process.exit(1); });
}
