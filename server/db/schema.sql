-- SetupSO MVP 2 — Database Schema (SQLite)
-- Execute via: node server/db/migrate.js
-- Encoding: UTF-8
-- Atualizado: 2026-05-04

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- TABELA: users
-- Colaboradores que acessam o sistema (login/senha).
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,          -- UUID v4
  username      TEXT NOT NULL UNIQUE,      -- login único (ex.: "joao.silva")
  password_hash TEXT NOT NULL,             -- bcrypt hash (rounds >= 12)
  display_name  TEXT NOT NULL,             -- nome exibido na UI e nos relatórios
  role          TEXT NOT NULL              -- "admin" | "operator"
                DEFAULT 'operator'
                CHECK(role IN ('admin','operator')),
  is_active     INTEGER NOT NULL DEFAULT 1, -- 0 = desativado (não apaga histórico)
  created_at    TEXT NOT NULL,             -- ISO 8601
  updated_at    TEXT NOT NULL              -- ISO 8601
);

-- ============================================================
-- TABELA: rooms
-- Salas cirúrgicas / centros cirúrgicos.
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id         TEXT PRIMARY KEY,             -- UUID v4
  code       TEXT NOT NULL UNIQUE,         -- código exibido (ex.: "Sala 3", "SO-01")
  name       TEXT,                         -- nome completo (opcional)
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============================================================
-- TABELA: cases
-- Cada cirurgia/procedimento associado a uma sala.
-- Um case fica "active" durante o procedimento e "completed" ao fechar.
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
  id                       TEXT PRIMARY KEY,   -- UUID v4
  room_id                  TEXT NOT NULL REFERENCES rooms(id),
  status                   TEXT NOT NULL       -- "active" | "completed" | "cancelled"
                           DEFAULT 'active'
                           CHECK(status IN ('active','completed','cancelled')),

  -- Dados do paciente / aviso cirúrgico
  notice_name              TEXT,               -- aviso (nome/código)
  full_name                TEXT,               -- nome completo do paciente
  attendance_number        TEXT,               -- número de atendimento (HIS/MV)
  surgeon_name             TEXT,
  procedure_name           TEXT,
  birth_date               TEXT,               -- ISO date (YYYY-MM-DD)
  allergies                TEXT,
  weight_kg                REAL,
  height_cm                REAL,
  planned_surgery_time_hhmm TEXT,              -- previsão de início HH:MM
  reference_date_iso       TEXT NOT NULL,      -- data do dia do procedimento (ISO date)

  -- KPIs / Autoclose
  is_auto                  INTEGER NOT NULL DEFAULT 0, -- 1 = fechado por regra automática

  -- Auditoria
  created_by_user_id       TEXT REFERENCES users(id),  -- colaborador que abriu o case
  closed_by_user_id        TEXT REFERENCES users(id),  -- colaborador que encerrou
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL,
  closed_at                TEXT                         -- ISO 8601, NULL se ainda ativo
);

CREATE INDEX IF NOT EXISTS idx_cases_room_status ON cases(room_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_reference_date ON cases(reference_date_iso);

-- ============================================================
-- TABELA: events
-- Cada registro de ação em um case (in/out, start/end, etc.).
-- Campos de auditoria indicam quem registrou e quando.
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id                  TEXT PRIMARY KEY,        -- UUID v4
  case_id             TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,           -- chave do EVENT_TYPES (ex.: "surgery", "rpa")
  action              TEXT NOT NULL            -- "in"|"out" ou "start"|"end"
                      CHECK(action IN ('in','out','start','end')),
  event_timestamp     TEXT NOT NULL,           -- ISO 8601 — momento real do evento

  -- Sobreposição manual
  is_manual_override  INTEGER NOT NULL DEFAULT 0, -- 1 = usuário editou manualmente o horário

  -- Auditoria
  created_by_user_id  TEXT REFERENCES users(id), -- quem registrou (NULL se importado/legado)
  created_at          TEXT NOT NULL              -- momento em que o registro foi criado no DB
);

CREATE INDEX IF NOT EXISTS idx_events_case_id ON events(case_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by_user_id);

-- ============================================================
-- TABELA: import_log
-- Rastreia importações vindas do localStorage (migração).
-- ============================================================
CREATE TABLE IF NOT EXISTS import_log (
  id             TEXT PRIMARY KEY,
  imported_by    TEXT REFERENCES users(id),
  source_device  TEXT,                        -- user-agent ou identificador do dispositivo
  imported_at    TEXT NOT NULL,
  cases_imported INTEGER NOT NULL DEFAULT 0,
  events_imported INTEGER NOT NULL DEFAULT 0,
  raw_payload    TEXT                         -- JSON original importado (para auditoria)
);
