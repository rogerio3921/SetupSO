// SetupSO — seed initial tenant, admin user and rooms
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const pool = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ----- Tenant -----
    const tenantRes = await client.query(
      `INSERT INTO tenants (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['Hospital Demo', 'hospital-demo']
    );
    const tenantId = tenantRes.rows[0].id;
    console.log('Tenant id:', tenantId);

    // ----- Admin user -----
    const adminHash = await bcrypt.hash('admin123', 12);
    await client.query(
      `INSERT INTO users (tenant_id, username, name, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (tenant_id, username) DO NOTHING`,
      [tenantId, 'admin', 'Administrador', adminHash]
    );
    console.log('Admin user: admin / admin123');

    // ----- Collaborator user -----
    const collabHash = await bcrypt.hash('colab123', 12);
    await client.query(
      `INSERT INTO users (tenant_id, username, name, password_hash, role)
       VALUES ($1, $2, $3, $4, 'collaborator')
       ON CONFLICT (tenant_id, username) DO NOTHING`,
      [tenantId, 'colaborador', 'Colaborador Demo', collabHash]
    );
    console.log('Collaborator user: colaborador / colab123');

    // ----- Rooms -----
    const roomCodes = ['Sala 1', 'Sala 2', 'Sala 3'];
    for (var i = 0; i < roomCodes.length; i++) {
      await client.query(
        `INSERT INTO rooms (tenant_id, code)
         VALUES ($1, $2)`,
        [tenantId, roomCodes[i]]
      );
    }
    console.log('Rooms created:', roomCodes.join(', '));

    await client.query('COMMIT');
    console.log('\nSeed complete! Tenant slug: hospital-demo');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(function () { pool.end(); process.exit(0); })
    .catch(function (err) { console.error('Seed failed:', err); pool.end(); process.exit(1); });
}

module.exports = { seed };
