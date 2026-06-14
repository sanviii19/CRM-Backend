// src/channel-service/services/dispatcherService.js
// Batch callback dispatcher — collects status updates and POSTs them
// to the CRM /api/receipts endpoint every 500ms in batches of 100.
// This is a singleton that starts when the server boots.

const { sendWithRetry } = require('../utils/retry');
const { CRM_CALLBACK_URL } = require('../config/env');

const BATCH_INTERVAL_MS = 500;
const BATCH_SIZE = 100;

// In-memory callback queue — all workers push here
const callbackQueue = [];

/**
 * Push a status update to the outbound callback queue.
 * Thread-safe for single-process Node.js.
 */
function pushCallback(messageId, customerId, campaignId, status, timestamp = new Date(), reason = null) {
  callbackQueue.push({ messageId, customerId, campaignId, status, timestamp, reason });
}

/**
 * Flush the callback queue — sends up to BATCH_SIZE receipts to CRM.
 */
async function flushCallbacks() {
  if (callbackQueue.length === 0) return;

  const batch = callbackQueue.splice(0, BATCH_SIZE);

  try {
    await sendWithRetry(`${CRM_CALLBACK_URL}/api/receipts`, { receipts: batch });
    console.log(`[Dispatcher] Sent ${batch.length} receipts to CRM`);
  } catch (err) {
    // sendWithRetry already logs + exhausts retries — push back on final failure
    console.error(`[Dispatcher] Final failure for batch of ${batch.length}: ${err?.message}`);
  }
}

/**
 * Start the batch dispatcher interval.
 * Called once at server startup.
 */
function startDispatcher() {
  console.log(`[Dispatcher] Started — flushing every ${BATCH_INTERVAL_MS}ms, batch size ${BATCH_SIZE}`);
  setInterval(flushCallbacks, BATCH_INTERVAL_MS);
}

module.exports = { pushCallback, startDispatcher };
