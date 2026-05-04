/**
 * Migration: criação do schema inicial do SetupSO MVP Online.
 * Tabelas: users, rooms, cases, events, audit_log
 */

exports.up = async function (knex) {
  // ── users ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable("users", (t) => {
    t.increments("id").primary();
    t.string("name", 120).notNullable();
    t.string("username", 60).notNullable().unique();
    t.string("password_hash", 255).notNullable();
    t.string("role", 20).notNullable().defaultTo("collaborator"); // 'admin' | 'collaborator'
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer("created_by_user_id").references("id").inTable("users").nullable();
  });

  // ── rooms ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable("rooms", (t) => {
    t.increments("id").primary();
    t.string("code", 60).notNullable().unique();
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer("created_by_user_id").references("id").inTable("users").nullable();
  });

  // ── cases ──────────────────────────────────────────────────────────────────
  await knex.schema.createTable("cases", (t) => {
    t.uuid("id").primary();
    t.integer("room_id").notNullable().references("id").inTable("rooms");
    t.string("code", 60).notNullable();
    t.string("status", 20).notNullable().defaultTo("active"); // 'active' | 'closed'
    t.string("patient_phase", 20).notNullable().defaultTo("open"); // 'open' | 'closed'
    t.string("room_phase", 20).notNullable().defaultTo("open"); // 'open' | 'closed'
    // Patient data
    t.string("full_name", 200).defaultTo("");
    t.string("notice_number", 60).defaultTo("");
    t.string("procedure_name", 200).defaultTo("");
    t.string("surgeon_name", 120).defaultTo("");
    t.string("attendance_number", 60).defaultTo("");
    t.date("birth_date").nullable();
    t.text("allergies").defaultTo("");
    t.decimal("weight_kg", 5, 1).nullable();
    t.decimal("height_cm", 5, 1).nullable();
    t.string("planned_surgery_time", 5).defaultTo(""); // "HH:MM"
    t.date("reference_date").nullable();
    // Audit
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer("created_by_user_id").notNullable().references("id").inTable("users");
    t.timestamp("updated_at", { useTz: true }).nullable();
    t.integer("updated_by_user_id").references("id").inTable("users").nullable();
  });

  // ── events ─────────────────────────────────────────────────────────────────
  await knex.schema.createTable("events", (t) => {
    t.uuid("id").primary();
    t.uuid("case_id").notNullable().references("id").inTable("cases");
    t.string("event_key", 60).notNullable(); // 'anesthesia_team', 'surgery', etc.
    t.string("action", 20).notNullable(); // 'in', 'out', 'start', 'end'
    t.timestamp("happened_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.boolean("auto").notNullable().defaultTo(false);
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer("created_by_user_id").references("id").inTable("users").nullable(); // null when auto=true
    // Indexes
    t.index(["case_id", "event_key", "action"]);
    t.index(["happened_at"]);
  });

  // ── audit_log ──────────────────────────────────────────────────────────────
  await knex.schema.createTable("audit_log", (t) => {
    t.increments("id").primary();
    t.string("table_name", 60).notNullable();
    t.string("record_id", 60).notNullable();
    t.string("action", 20).notNullable(); // 'INSERT' | 'UPDATE' | 'DELETE'
    t.json("changed_fields").nullable();
    t.integer("performed_by_user_id").references("id").inTable("users").nullable();
    t.timestamp("performed_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("audit_log");
  await knex.schema.dropTableIfExists("events");
  await knex.schema.dropTableIfExists("cases");
  await knex.schema.dropTableIfExists("rooms");
  await knex.schema.dropTableIfExists("users");
};
