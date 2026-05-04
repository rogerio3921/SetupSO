-- SetupSO Database Schema
-- Multi-tenant: each hospital has its own tenant row
-- Every data row is scoped to a tenant_id

-- Tenants (hospitals)
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username      TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'collaborator', -- 'admin' | 'collaborator'
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, username)
);

-- Rooms (operating rooms)
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cases (one surgical case per room session)
CREATE TABLE IF NOT EXISTS cases (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id             UUID        NOT NULL REFERENCES rooms(id),
  code                TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'active', -- 'active' | 'closed'
  patient_phase       TEXT        NOT NULL DEFAULT 'open',
  room_phase          TEXT        NOT NULL DEFAULT 'open',
  data                JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id  UUID        REFERENCES users(id)
);

-- Events (all timeline events for a case)
CREATE TABLE IF NOT EXISTS events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id             UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_key           TEXT        NOT NULL,
  action              TEXT        NOT NULL,
  happened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto                BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id  UUID        REFERENCES users(id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_tenant       ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant       ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_room  ON cases(tenant_id, room_id);
CREATE INDEX IF NOT EXISTS idx_cases_status       ON cases(status);
CREATE INDEX IF NOT EXISTS idx_events_case        ON events(case_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant      ON events(tenant_id);
