// server/seed.js — seed demo tenant + admin user
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./db");

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create demo tenant
    const tenantRes = await client.query(`
      INSERT INTO tenants (slug, name)
      VALUES ('demo', 'Hospital Demo')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const tenantId = tenantRes.rows[0].id;
    console.log("Tenant: Hospital Demo (slug=demo, id=" + tenantId + ")");

    // Create admin user
    const passwordHash = await bcrypt.hash("Admin@1234", 10);
    await client.query(`
      INSERT INTO users (tenant_id, username, code, password_hash, role)
      VALUES ($1, 'admin', 'admin01', $2, 'admin')
      ON CONFLICT (tenant_id, username) DO UPDATE SET
        code = EXCLUDED.code,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `, [tenantId, passwordHash]);
    console.log("Admin user: username=admin, code=admin01, password=Admin@1234, role=admin");

    // Create a collaborator user
    const collabHash = await bcrypt.hash("Collab@1234", 10);
    await client.query(`
      INSERT INTO users (tenant_id, username, code, password_hash, role)
      VALUES ($1, 'colaborador', 'col01', $2, 'collaborator')
      ON CONFLICT (tenant_id, username) DO UPDATE SET
        code = EXCLUDED.code,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `, [tenantId, collabHash]);
    console.log("Collaborator user: username=colaborador, code=col01, password=Collab@1234, role=collaborator");

    // Create demo rooms
    const rooms = [
      { code: "Sala 1" },
      { code: "Sala 2" },
      { code: "Sala 3" }
    ];
    for (const room of rooms) {
      const existing = await client.query(
        "SELECT id FROM rooms WHERE tenant_id=$1 AND code=$2",
        [tenantId, room.code]
      );
      if (existing.rows.length === 0) {
        await client.query(
          "INSERT INTO rooms (tenant_id, code) VALUES ($1, $2)",
          [tenantId, room.code]
        );
        console.log("Room created:", room.code);
      }
    }

    await client.query("COMMIT");
    console.log("\nSeed completed. Ready to log in with:");
    console.log("  Hospital: demo");
    console.log("  User: admin  (or code: admin01)");
    console.log("  Password: Admin@1234");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
