"use strict";
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/setupso.db");

function openDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      slug       TEXT    UNIQUE NOT NULL,
      name       TEXT    NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id     INTEGER NOT NULL REFERENCES tenants(id),
      name          TEXT    NOT NULL,
      username      TEXT,
      code          TEXT,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'colaborador',
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, username),
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id  INTEGER NOT NULL REFERENCES tenants(id),
      code       TEXT    NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cases (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id           INTEGER NOT NULL REFERENCES tenants(id),
      room_id             INTEGER NOT NULL REFERENCES rooms(id),
      code                TEXT    NOT NULL,
      status              TEXT    NOT NULL DEFAULT 'active',
      patient_phase       TEXT    NOT NULL DEFAULT 'open',
      room_phase          TEXT    NOT NULL DEFAULT 'open',
      data_json           TEXT    NOT NULL DEFAULT '{}',
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      created_by_user_id  INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id           INTEGER NOT NULL REFERENCES tenants(id),
      case_id             INTEGER NOT NULL REFERENCES cases(id),
      event_key           TEXT    NOT NULL,
      action              TEXT    NOT NULL,
      happened_at         TEXT    NOT NULL,
      auto                INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      created_by_user_id  INTEGER REFERENCES users(id)
    );
  `);
}

function seed(db) {
  const bcrypt = require("bcryptjs");

  const existingTenant = db.prepare("SELECT id FROM tenants WHERE slug = ?").get("demo");
  if (existingTenant) return;

  const tenantId = db.prepare(
    "INSERT INTO tenants (slug, name) VALUES (?, ?)"
  ).run("demo", "Hospital Demo").lastInsertRowid;

  const adminHash = bcrypt.hashSync("admin123", 10);
  db.prepare(
    "INSERT INTO users (tenant_id, name, username, code, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(tenantId, "Administrador", "admin", "ADM01", adminHash, "admin");

  const colaboradorHash = bcrypt.hashSync("senha123", 10);
  db.prepare(
    "INSERT INTO users (tenant_id, name, username, code, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(tenantId, "João Silva", "joao.silva", "JS01", colaboradorHash, "colaborador");

  db.prepare(
    "INSERT INTO rooms (tenant_id, code) VALUES (?, ?)"
  ).run(tenantId, "Sala 3");

  console.log("Seed: tenant 'demo' criado com admin/admin123 e joao.silva/senha123 (código JS01).");
}

let _db = null;
function getDb() {
  if (!_db) {
    _db = openDb();
    migrate(_db);
    seed(_db);
  }
  return _db;
}

if (require.main === module) {
  const db = getDb();
  console.log("Banco migrado em:", DB_PATH);
  db.close();
}

module.exports = { getDb };
