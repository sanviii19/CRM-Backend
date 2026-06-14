// src/channel-service/config/redis.js
// IORedis connection singleton — shared by BullMQ Queue, Worker, and QueueEvents.

const { Redis } = require('ioredis');
const { REDIS_URL } = require('./env');

/**
 * Creates a new IORedis connection with sane defaults.
 * BullMQ needs separate connections for Queue, Worker, and QueueEvents.
 */
function createRedisConnection() {
  const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,  // Required by BullMQ
    enableReadyCheck: false,     // Required for BullMQ compatibility
    lazyConnect: false,
    tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  connection.on('connect', () => console.log('[Redis] Connected'));
  connection.on('error', (err) => console.error('[Redis] Error:', err.message));

  return connection;
}

module.exports = { createRedisConnection };
