# SetupSO — Architecture Documentation

> **Status:** Planning / Scaffolding — no backend code yet.  
> This document is the actionable reference for implementing the Online MVP.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Target Architecture](#2-target-architecture)
3. [Multi-Hospital (Multi-Tenant) Strategy](#3-multi-hospital-multi-tenant-strategy)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Audit Logging](#5-audit-logging)
6. [Database Schema](#6-database-schema)
7. [API Contracts](#7-api-contracts)
8. [Deployment Strategies](#8-deployment-strategies)
9. [Migration from localStorage](#9-migration-from-localstorage)

---

## 1. Overview

SetupSO currently runs as a pure-browser application (localStorage only).  
The **Online MVP** adds:

| Concern | Solution |
|---|---|
| Persistence | PostgreSQL via REST API |
| Authentication | Username + password → JWT |
| Authorization | RBAC: `admin` / `collaborator` |
| Multi-hospital | Tenant isolation via `tenant_id` |
| Audit | `created_by_user_id` on every write |
| Deployment | Docker Compose (cloud or on-prem) |

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────┐
│  Client (browser — tablet or PC)                    │
│  index8.html + app.js  (static files)               │
│  served by Nginx                                    │
└──────────────────────┬──────────────────────────────┘
                       │  HTTPS / REST JSON
┌──────────────────────▼──────────────────────────────┐
│  Backend API (Node.js / Express)                    │
│  • /auth/*          — login, session                │
│  • /rooms/*         — room CRUD                     │
│  • /cases/*         — case CRUD                     │
│  • /events/*        — event registration            │
│  • /users/*         — user management (admin only)  │
│  • /reports/*       — aggregated metrics            │
└──────────────────────┬──────────────────────────────┘
                       │  SQL
┌──────────────────────▼──────────────────────────────┐
│  PostgreSQL                                         │
│  (tenants, users, rooms, cases, events, audit_log)  │
└─────────────────────────────────────────────────────┘
```

### Component responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | Vanilla JS + Tailwind CDN | UI, API calls via `fetch`, local cache |
| Backend API | Node.js + Express | Auth, business logic, DB access |
| Database | PostgreSQL 16 | Persistent storage |
| Reverse proxy | Nginx | TLS termination, static files, API proxy |

### Frontend API integration (minimal change strategy)

The existing `app.js` currently calls `loadState()` / `saveState()` with `localStorage`.  
Migration approach:

1. Add an `api.js` module that wraps `fetch` with the JWT header.
2. Replace `loadState()` → `api.getRooms()` + `api.getActiveCase(roomId)`.
3. Replace `addEvent()` body → `api.postEvent(caseId, payload)`.
4. Keep `localStorage` as an offline cache (optional — for degraded mode).

---

## 3. Multi-Hospital (Multi-Tenant) Strategy

### Tenant isolation model

Every resource belongs to exactly one tenant. This is enforced at three levels:

1. **Database** — every table (except `tenants` itself) has a `tenant_id` column with a `NOT NULL` foreign key constraint.
2. **API middleware** — after JWT verification, the middleware extracts `tenantId` from the token payload and injects it into every query automatically.
3. **Application layer** — no endpoint ever accepts `tenant_id` from the request body; the value always comes from the authenticated token.

### Tenant identification in the JWT

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "role": "collaborator",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Tenant routing strategies

| Strategy | How it works | Best for |
|---|---|---|
| **Subdomain** | `hospital-a.setupso.com` → resolve tenant from subdomain | Cloud SaaS |
| **Path prefix** | `setupso.com/hospital-a/api/...` | Simpler proxy config |
| **Token only** | Tenant resolved exclusively from JWT | On-prem (single hospital per install) |

For the cloud deployment, the **subdomain** strategy is recommended.  
For on-prem, **token only** is sufficient (one tenant per Docker Compose stack).

---

## 4. Authentication & Authorization

### Login flow

```
1. User POST /auth/login { username, password }
2. API fetches user record from DB (filtered by tenant_id if using subdomain strategy)
3. API verifies password with bcrypt.compare(password, passwordHash)
4. On success → sign JWT { sub, tenantId, role } with HS256 (secret from env)
5. Return { token, expiresIn, user: { id, name, role } }
6. Frontend stores token in memory (or sessionStorage); attaches as Authorization: Bearer <token>
```

### Password storage

- Hash algorithm: **bcrypt** with cost factor ≥ 12 (or **argon2id** — preferred for new projects).
- Never store plaintext passwords.
- Password reset: admin generates a temporary password; user must change on first login.

### Token strategy

| Option | Pros | Cons |
|---|---|---|
| **JWT (stateless)** | No server-side session store needed | Cannot revoke before expiry |
| **Session + cookie** | Revocable, httpOnly cookie | Requires session store (Redis/DB) |

**Recommendation for MVP:** JWT with a short expiry (8 hours) and an `active` flag check on each request (allows soft-revocation by setting `users.active = false`).

### RBAC roles

| Role | Permissions |
|---|---|
| `admin` | Manage users (create, deactivate, reset password) · Manage rooms · View all reports · Close cases |
| `collaborator` | Register events · Edit case details · View rooms and reports |

RBAC is enforced in a middleware layer:

```
request → JWT verify → tenant inject → role check → handler
```

---

## 5. Audit Logging

### Approach A — Inline fields (minimum viable)

Every write table includes:

```sql
created_by_user_id  UUID  NOT NULL REFERENCES users(id)
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

For updates (e.g. editing case details):

```sql
updated_by_user_id  UUID  REFERENCES users(id)
updated_at          TIMESTAMPTZ
```

This satisfies "who did what" for the most critical actions (registering events, editing case details).

### Approach B — Audit log table (recommended when LGPD compliance is needed)

```sql
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  action          TEXT NOT NULL,          -- 'case.update', 'event.create', etc.
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Recommendation for MVP:** start with Approach A (inline fields). Add the `audit_log` table when preparing for LGPD compliance.

---

## 6. Database Schema

### Entity-relationship overview

```
tenants 1──* users
tenants 1──* rooms
tenants 1──* cases
tenants 1──* events

rooms 1──* cases
cases 1──* events
users 1──* events   (created_by_user_id)
users 1──* cases    (created_by_user_id)
```

### DDL (PostgreSQL)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tenants ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                 -- "Hospital São Lucas"
  slug          TEXT NOT NULL UNIQUE,          -- "hospital-sao-lucas"
  plan          TEXT NOT NULL DEFAULT 'mvp',   -- future: 'standard', 'enterprise'
  active        BOOLEAN NOT NULL DEFAULT true,
  settings      JSONB NOT NULL DEFAULT '{}',   -- per-tenant config (future)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username        TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'collaborator')),
  active          BOOLEAN NOT NULL DEFAULT true,
  must_change_pwd BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, username)
);

-- ── Rooms ──────────────────────────────────────────────────────────────────
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,               -- "Sala 3"
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

-- ── Cases ──────────────────────────────────────────────────────────────────
CREATE TABLE cases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id             UUID NOT NULL REFERENCES rooms(id),
  code                TEXT NOT NULL,           -- auto-generated (e.g. "SETUP-20260501-001")
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'closed')),
  patient_phase       TEXT,                    -- e.g. "surgery"
  room_phase          TEXT,                    -- e.g. "setup"
  data                JSONB NOT NULL DEFAULT '{}',  -- flexible patient/case details
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id  UUID NOT NULL REFERENCES users(id),
  closed_at           TIMESTAMPTZ,
  closed_by_user_id   UUID REFERENCES users(id),
  updated_at          TIMESTAMPTZ,
  updated_by_user_id  UUID REFERENCES users(id)
);
CREATE INDEX idx_cases_tenant_room ON cases(tenant_id, room_id);
CREATE INDEX idx_cases_status ON cases(tenant_id, status);

-- ── Events ─────────────────────────────────────────────────────────────────
CREATE TABLE events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id             UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_key           TEXT NOT NULL,   -- "anesthesia_team", "surgical_team", etc.
  action              TEXT NOT NULL    -- "IN", "OUT", "START", "END"
                      CHECK (action IN ('IN', 'OUT', 'START', 'END')),
  happened_at         TIMESTAMPTZ NOT NULL,
  auto                BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id  UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_events_case ON events(case_id);
CREATE INDEX idx_events_tenant_date ON events(tenant_id, happened_at);

-- ── Audit log (optional — add when LGPD compliance is required) ─────────────
-- CREATE TABLE audit_log (
--   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   tenant_id   UUID NOT NULL REFERENCES tenants(id),
--   user_id     UUID NOT NULL REFERENCES users(id),
--   action      TEXT NOT NULL,
--   table_name  TEXT NOT NULL,
--   record_id   UUID NOT NULL,
--   old_value   JSONB,
--   new_value   JSONB,
--   created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
```

---

## 7. API Contracts

Full OpenAPI 3.1 specification: **[openapi.yaml](openapi.yaml)**

### Quick reference

#### Auth

| Method | Path | Auth required | Description |
|---|---|---|---|
| `POST` | `/auth/login` | ✗ | Authenticate and receive JWT |
| `GET` | `/auth/me` | ✓ | Get current user info |
| `POST` | `/auth/logout` | ✓ | Invalidate session (optional) |
| `POST` | `/auth/change-password` | ✓ | Change own password |

**POST /auth/login — Request**
```json
{
  "username": "joana.silva",
  "password": "S3nh@F0rte"
}
```

**POST /auth/login — Response 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 28800,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "joana.silva",
    "fullName": "Joana Silva",
    "role": "collaborator"
  }
}
```

**POST /auth/login — Response 401**
```json
{ "error": "INVALID_CREDENTIALS" }
```

---

#### Users (admin only)

| Method | Path | Description |
|---|---|---|
| `GET` | `/users` | List users in current tenant |
| `POST` | `/users` | Create user |
| `PATCH` | `/users/:id` | Update user (name, role, active) |
| `POST` | `/users/:id/reset-password` | Admin resets a user's password |

**POST /users — Request**
```json
{
  "username": "carlos.melo",
  "fullName": "Carlos Melo",
  "password": "TempP@ssw0rd",
  "role": "collaborator"
}
```

**POST /users — Response 201**
```json
{
  "id": "661f7400-e29b-41d4-a716-556655440001",
  "username": "carlos.melo",
  "fullName": "Carlos Melo",
  "role": "collaborator",
  "active": true,
  "mustChangePwd": true,
  "createdAt": "2026-05-01T10:00:00Z"
}
```

---

#### Rooms

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/rooms` | ✓ (any) | List active rooms |
| `POST` | `/rooms` | ✓ (admin) | Create room |
| `PATCH` | `/rooms/:id` | ✓ (admin) | Update room |
| `DELETE` | `/rooms/:id` | ✓ (admin) | Deactivate room |

**GET /rooms — Response 200**
```json
[
  { "id": "...", "code": "Sala 3", "description": null, "active": true }
]
```

---

#### Cases

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/rooms/:roomId/active-case` | ✓ | Get active case for a room |
| `GET` | `/cases` | ✓ | List cases (with filters) |
| `POST` | `/cases` | ✓ | Create new case |
| `PATCH` | `/cases/:id` | ✓ | Update case details / status |

**POST /cases — Request**
```json
{
  "roomId": "room-uuid",
  "code": "SETUP-20260501-001",
  "data": {
    "patientName": "",
    "surgeonName": "",
    "procedureName": "",
    "scheduledTime": "2026-05-01T08:00:00Z"
  }
}
```

**POST /cases — Response 201**
```json
{
  "id": "case-uuid",
  "tenantId": "tenant-uuid",
  "roomId": "room-uuid",
  "code": "SETUP-20260501-001",
  "status": "active",
  "data": { "patientName": "", ... },
  "createdAt": "2026-05-01T07:55:00Z",
  "createdByUserId": "user-uuid"
}
```

**PATCH /cases/:id — Request**
```json
{
  "data": { "patientName": "M.S.", "surgeonName": "Dr. Lima" },
  "status": "closed"
}
```

---

#### Events

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/cases/:caseId/events` | ✓ | List all events for a case |
| `POST` | `/cases/:caseId/events` | ✓ | Register an event |

**POST /cases/:caseId/events — Request**
```json
{
  "eventKey": "anesthesia_team",
  "action": "IN",
  "happenedAt": "2026-05-01T08:12:30Z",
  "auto": false
}
```

**POST /cases/:caseId/events — Response 201**
```json
{
  "id": "event-uuid",
  "caseId": "case-uuid",
  "eventKey": "anesthesia_team",
  "action": "IN",
  "happenedAt": "2026-05-01T08:12:30Z",
  "auto": false,
  "createdAt": "2026-05-01T08:12:31Z",
  "createdByUserId": "user-uuid"
}
```

---

#### Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/reports/cases` | ✓ | Cases with computed durations |

**GET /reports/cases?from=2026-05-01&to=2026-05-31 — Response 200**
```json
{
  "from": "2026-05-01",
  "to": "2026-05-31",
  "totalCases": 42,
  "cases": [
    {
      "id": "case-uuid",
      "code": "SETUP-20260501-001",
      "roomCode": "Sala 3",
      "status": "closed",
      "surgeryTimeMs": 3600000,
      "anesthesiaTimeMs": 4200000,
      "closedAt": "2026-05-01T12:00:00Z"
    }
  ]
}
```

---

### Common error response format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description (English or Portuguese)",
  "details": {}
}
```

| HTTP Status | Error code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Token valid but insufficient role |
| 404 | `NOT_FOUND` | Resource not found (or wrong tenant) |
| 409 | `CONFLICT` | Duplicate resource (e.g. username) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 8. Deployment Strategies

### 8.1 Local development (Docker Compose)

```bash
cp .env.example .env      # configure env vars
docker compose up -d       # start api + postgres + nginx
```

Services started:

| Service | Port | Description |
|---|---|---|
| `nginx` | 80, 443 | Reverse proxy + static files |
| `api` | 3000 (internal) | Node.js backend |
| `postgres` | 5432 (internal) | PostgreSQL 16 |

### 8.2 Cloud deployment

**Recommended stack (low-cost MVP):**

1. **Static frontend** — deploy `index8.html` + `app.js` to a CDN or object storage (S3-compatible).
2. **Backend API** — a single container on any managed container service (e.g. Railway, Render, Fly.io, AWS ECS, Azure Container Apps).
3. **Database** — managed PostgreSQL (e.g. Supabase, Neon, Railway Postgres, AWS RDS, Azure Database for PostgreSQL).

**Environment variables** (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` — random 256-bit secret for signing tokens.
- `CORS_ORIGIN` — allowed frontend origin(s).
- `NODE_ENV=production`

**Security checklist for cloud:**
- [ ] HTTPS enforced (TLS 1.2+ via load balancer / managed service).
- [ ] `JWT_SECRET` rotated on first deploy; stored in secrets manager.
- [ ] Database not publicly reachable (private VPC or connection string only).
- [ ] CORS restricted to the frontend origin.
- [ ] Passwords never logged.

### 8.3 On-prem (hospital server)

Use Docker Compose (same `docker-compose.yml`) on a Linux server in the hospital network.

**Additional steps:**
- Install a TLS certificate (Let's Encrypt with DNS challenge, or a hospital-issued cert).
- Schedule PostgreSQL backups (`pg_dump` cron → secure network share).
- Restrict API port to hospital intranet (firewall rules).
- Use `.env` file with `chmod 600` permissions; never commit it to git.

**docker-compose.yml** (see root of repository) sets up:
- `postgres` — data volume persisted in `./data/postgres`.
- `api` — built from `./api` Dockerfile (to be created in a future PR).
- `nginx` — serves static frontend and proxies `/api` to the `api` container.

### 8.4 Environment variables

See `.env.example` at the root of the repository for all required and optional variables.

Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | ✓ | Random 32+ character secret |
| `JWT_EXPIRES_IN` | — | Default: `8h` |
| `PORT` | — | API listen port. Default: `3000` |
| `CORS_ORIGIN` | ✓ | Frontend URL, e.g. `https://setupso.hospital.com` |
| `NODE_ENV` | ✓ | `development` or `production` |
| `BCRYPT_ROUNDS` | — | Default: `12` |

---

## 9. Migration from localStorage

The existing MVP 2 stores all state in `localStorage` under the key `setupso_mvp2_state_ultra_robust_*`.

### Migration flow (optional import)

1. User logs in for the first time.
2. Frontend checks `localStorage` for an existing state object.
3. If found, display a prompt: **"Import local data to the server? (one-time migration)"**
4. On confirm, frontend reads the state and POSTs:
   - Rooms → `POST /rooms` for each room not yet on the server.
   - Cases → `POST /cases` for each case.
   - Events → `POST /cases/:caseId/events` for each event.
5. After successful import, clear the relevant `localStorage` keys.

### Notes

- The migration is **optional** and **one-time**. It is safe to skip it and start fresh.
- Events imported via this path will have `auto: false` and `createdByUserId` set to the importing user.
- The migration endpoint should be idempotent (deduplicate by code + happened_at if re-run).

---

*Document maintained by the SetupSO development team.*  
*Last updated: 2026-05-04*
