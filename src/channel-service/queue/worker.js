// src/channel-service/queue/worker.js
// BullMQ Worker — processes one message job at a time.
// Picks jobs from the "messages" queue and calls the simulator.

const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { simulateDelivery } = require('../services/simulatorService');
const { jobModel } = require('../models/jobModel');
const { pushCallback } = require('../services/dispatcherService');

let worker = null;

/**
 * Initialize and start the BullMQ worker.
 * Called once from server.js after dispatcher is started.
 */
function startWorker() {
  const connection = createRedisConnection();

  worker = new Worker(
    'messages',
    async (job) => {
      const { messageId, customerId, campaignId, channel, content } = job.data;

      // Update in-memory status
      jobModel.set(messageId, { messageId, customerId, campaignId, channel, status: 'SENT' });

      // Run delivery simulation (may throw → triggers BullMQ retry)
      await simulateDelivery({ ...job.data, attemptsMade: job.attemptsMade });

      // Update in-memory status to delivered
      jobModel.set(messageId, { messageId, customerId, campaignId, channel, status: 'DELIVERED' });
    },
    {
      connection,
      concurrency: 50, // Process 50 messages simultaneously to speed up simulation
    }
  );

  worker.on('completed', (job) => {
    // Logged by simulator — kept quiet here to avoid noise
  });

  worker.on('failed', (job, err) => {
    const { messageId, customerId, campaignId } = job.data;
    const isLastAttempt = job.attemptsMade >= job.opts.attempts;

    if (isLastAttempt) {
      // Extract reason if present: "Delivery failed for XYZ | Reason: User opted out"
      const reasonMatch = err.message.match(/Reason:\s*(.*)$/);
      const reason = reasonMatch ? reasonMatch[1] : "Unknown error";

      // All retries exhausted — mark as permanently FAILED
      console.error(`[Worker] ☠️  PERMANENT FAIL  ${messageId?.slice(-8)} after ${job.attemptsMade} attempts: ${reason}`);
      jobModel.set(messageId, { messageId, customerId, campaignId, status: 'FAILED' });
      pushCallback(messageId, customerId, campaignId, 'FAILED', new Date(), reason);
    } else {
      console.warn(`[Worker] 🔄 RETRY ${job.attemptsMade}/${job.opts.attempts}  ${messageId?.slice(-8)}`);
    }
  });

  worker.on('error', (err) => {
    console.error('[Worker] Unhandled error:', err.message);
  });

  console.log('[Worker] Started — concurrency: 50, queue: messages');
  return worker;
}

/**
 * Gracefully close the worker.
 */
async function stopWorker() {
  if (worker) await worker.close();
}

module.exports = { startWorker, stopWorker };
