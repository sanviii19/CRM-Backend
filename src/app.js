// src/app.js
// Express app setup — no port binding here. That's server.js's job.

// Fix for BigInt serialization in JSON (e.g., Prisma COUNT/SUM returns BigInt)
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/index');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Restrict in production
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Support large bulk ingestion payloads
app.use(express.urlencoded({ extended: true }));

// ── Request Logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── 404 Catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
