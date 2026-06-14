// src/channel-service/queue/messageQueue.js
// BullMQ Queue definition with retry + backoff config.

const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

const connection = createRedisConnection();

/**
 * The main message queue.
 * defaultJobOptions configure retry behavior:
 *   - attempts: 4 total (1 initial + 3 retries)
 *   - exponential backoff: 500ms → 1s → 2s → 4s
 *   - removeOnComplete: keep last 500 jobs for visibility
 *   - removeOnFail: keep all failed jobs for debugging
 */
const messageQueue = new Queue('messages', {
  connection,
  defaultJobOptions: {
    attempts: 4,
    backoff: { type: 'exponential', delay: 500 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

module.exports = { messageQueue };
