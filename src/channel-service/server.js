// src/channel-service/server.js
// Channel Service entry point — runs on port 5001 as a SEPARATE process.
// Start with: node src/channel-service/server.js

require('./config/env');           // Fail fast on missing env vars
const http = require('http');
const app = require('./app');
const { startWorker, stopWorker } = require('./queue/worker');
const { startDispatcher } = require('./services/dispatcherService');

const PORT = process.env.CHANNEL_SERVICE_PORT || 5001;

const server = http.createServer(app);

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n[Channel-Service] ${signal} received — shutting down...`);
  await stopWorker();
  server.close(() => {
    console.log('[Channel-Service] Closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Boot sequence: dispatcher first → then worker → then HTTP server
startDispatcher();
startWorker();

server.listen(PORT, () => {
  console.log(`
📨 Xeno Channel Service running!
   ├─ HTTP API   → http://localhost:${PORT}/api
   ├─ POST /send → accepts message batches from CRM
   ├─ GET /health → queue stats
   └─ Worker     → concurrency 10, BullMQ + Redis
  `);
});
