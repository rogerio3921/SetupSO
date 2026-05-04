// SetupSO API — Express app entry point
// Serves static frontend from ../public + REST API
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

var express = require('express');
var cors = require('cors');
var path = require('path');
var { migrate } = require('./migrate');
var authMiddleware = require('./middleware/auth');

var authRoutes = require('./routes/auth');
var roomsRoutes = require('./routes/rooms');
var casesRoutes = require('./routes/cases');
var adminRoutes = require('./routes/admin');

var app = express();
var PORT = process.env.PORT || 3001;

// ── CORS ─────────────────────────────────────────────────────────────────────
var corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: corsOrigin !== '*'
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Health check (unauthenticated) ───────────────────────────────────────────
app.get('/health', function (req, res) {
  return res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/rooms', authMiddleware.authenticateToken, roomsRoutes);
app.use('/cases', authMiddleware.authenticateToken, casesRoutes);
app.use('/admin', authMiddleware.authenticateToken, adminRoutes);

// ── Serve static frontend from public/ ───────────────────────────────────────
var publicDir = path.join(__dirname, '../../public');
app.use(express.static(publicDir));

// SPA fallback — must be after API routes
app.get('*', function (req, res) {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Start after migration ─────────────────────────────────────────────────────
migrate()
  .then(function () {
    app.listen(PORT, function () {
      console.log('SetupSO API running on http://localhost:' + PORT);
      console.log('Frontend: http://localhost:' + PORT);
    });
  })
  .catch(function (err) {
    console.error('Startup migration failed:', err);
    process.exit(1);
  });
