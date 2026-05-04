// SetupSO API — database connection pool
'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', function (err) {
  console.error('Unexpected pg pool error:', err);
});

module.exports = pool;
