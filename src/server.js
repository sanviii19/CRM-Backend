// src/server.js
// Entry point — binds the port, initializes Socket.io, and connects to DB.

require('./config/env'); // Validate env vars first — fail fast on missing vars
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initSocket } = require('./config/socket');
const { prisma } = require('./config/db');

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

initSocket(io);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received — shutting down gracefully...');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received — shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

// Test DB connection then start server
async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected (Supabase PostgreSQL)');

    httpServer.listen(PORT, () => {
      console.log(`
🚀 Xeno CRM Backend running!
   ├─ HTTP API  → http://localhost:${PORT}/api
   ├─ Health    → http://localhost:${PORT}/api/health
   └─ Socket.io → ws://localhost:${PORT}
      `);
    });
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Make sure DATABASE_URL is set correctly in your .env file');
    process.exit(1);
  }
}

start();
