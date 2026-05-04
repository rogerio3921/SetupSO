/**
 * SetupSO — database initialisation and migrations
 * Run standalone:  node server/db.js
 */
"use strict";

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "setupso.db");

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      slug      TEXT    NOT NULL UNIQUE,
      name      TEXT    NOT NULL,
      created_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      username      TEXT    NOT NULL,
      code          TEXT,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'colaborador',
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, username)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id  INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS cases (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id        INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      tenant_id      INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      status         TEXT    NOT NULL DEFAULT 'active',
      data_json      TEXT    NOT NULL DEFAULT '{}',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      created_by     INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      event_key   TEXT    NOT NULL,
      action      TEXT    NOT NULL,
      happened_at TEXT    NOT NULL,
      auto        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      created_by  INTEGER REFERENCES users(id)
    );
  `);

  console.log("[db] migrations applied — DB:", DB_PATH);
}

// Allow running directly: node server/db.js
if (require.main === module) {
  const db = openDb();
  migrate(db);
  db.close();
}

module.exports = { openDb, migrate };
