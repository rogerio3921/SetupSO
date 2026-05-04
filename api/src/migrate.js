// SetupSO — run database migration (idempotent)
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration completed successfully.');
}

if (require.main === module) {
  migrate()
    .then(function () { process.exit(0); })
    .catch(function (err) { console.error('Migration failed:', err); process.exit(1); });
}

module.exports = { migrate };
