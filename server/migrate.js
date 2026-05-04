// server/migrate.js — run DB migrations
require("dotenv").config();
const pool = require("./db");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id        SERIAL PRIMARY KEY,
        slug      TEXT NOT NULL UNIQUE,
        name      TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id             SERIAL PRIMARY KEY,
        tenant_id      INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        username       TEXT NOT NULL,
        code           TEXT,
        password_hash  TEXT NOT NULL,
        role           TEXT NOT NULL DEFAULT 'collaborator',
        active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, username)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id         SERIAL PRIMARY KEY,
        tenant_id  INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        code       TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id                  TEXT PRIMARY KEY,
        tenant_id           INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        room_id             INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        code                TEXT NOT NULL,
        status              TEXT NOT NULL DEFAULT 'active',
        patient_phase       TEXT NOT NULL DEFAULT 'open',
        room_phase          TEXT NOT NULL DEFAULT 'open',
        data                JSONB NOT NULL DEFAULT '{}',
        created_by_user_id  INTEGER REFERENCES users(id),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by_user_id  INTEGER REFERENCES users(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id                  TEXT PRIMARY KEY,
        tenant_id           INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id             TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        event_key           TEXT NOT NULL,
        action              TEXT NOT NULL,
        happened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        auto                BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_user_id  INTEGER REFERENCES users(id),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
