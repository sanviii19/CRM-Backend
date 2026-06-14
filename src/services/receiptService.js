// src/services/receiptService.js
// Business logic for processing webhook receipts from the Channel Service.

const { messageStatusModel } = require('../models/messageStatusModel');
const { campaignModel } = require('../models/campaignModel');
const { getIO } = require('../config/socket');

// Valid state transitions (only allow forward progression)
const VALID_STATES = ['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'READ', 'CLICKED', 'CONVERTED'];

const batchQueue = [];
let isProcessing = false;

/**
 * Process a batch of receipts from the Channel Service.
 * Updates individual message statuses and batches campaign metric increments.
 * Emits real-time Socket.io updates per campaign.
 *
 * @param {Array<{ messageId: string, status: string, timestamp?: string }>} receipts
 */
async function processReceipts(receipts) {
  batchQueue.push(receipts);
  
  if (!isProcessing) {
    isProcessing = true;
    try {
      while (batchQueue.length > 0) {
        const batch = batchQueue.shift();
        await doProcessReceipts(batch);
      }
    } finally {
      isProcessing = false;
    }
  }
}

async function doProcessReceipts(receipts) {
  const campaignMetrics = {};

  // Group receipts by messageId to prevent Prisma concurrency conflicts on the same record
  const byMessage = {};
  for (const r of receipts) {
    if (!byMessage[r.messageId]) byMessage[r.messageId] = [];
    byMessage[r.messageId].push(r);
  }

  // Process independent messages concurrently
  await Promise.all(Object.values(byMessage).map(async (messageReceipts) => {
    // Process events for the *same* messageId strictly sequentially
    for (const receipt of messageReceipts) {
      const { messageId, status, timestamp, reason } = receipt;
      const normalizedStatus = status.toUpperCase();

      if (!VALID_STATES.includes(normalizedStatus)) continue;

      try {
        const updated = await messageStatusModel.updateStatus(messageId, normalizedStatus, timestamp, reason);

        const metricKey = normalizedStatus.toLowerCase();
        
        // Synchronous object mutation is thread-safe in Node.js
        if (!campaignMetrics[updated.campaignId]) {
          campaignMetrics[updated.campaignId] = {};
        }
        campaignMetrics[updated.campaignId][metricKey] =
          (campaignMetrics[updated.campaignId][metricKey] || 0) + 1;
      } catch (err) {
        if (err.code === 'P2025') {
          console.warn(`[Receipts] Message ${messageId} not found — skipping`);
        } else {
          console.error(`[Receipts] Failed to process ${status} for ${messageId}:`, err.message);
        }
      }
    }
  }));

  // Batch emit updates for all affected campaigns metric increments and emit socket events
  for (const [campaignId, metrics] of Object.entries(campaignMetrics)) {
    try {
      const updated = await campaignModel.incrementMetrics(campaignId, metrics);

      // Emit real-time update to clients watching this campaign
      try {
        const io = getIO();
        io.to(`campaign-${campaignId}`).emit('metrics-update', {
          queued: updated.queued,
          sent: updated.sent,
          delivered: updated.delivered,
          failed: updated.failed,
          opened: updated.opened,
          read: updated.read,
          clicked: updated.clicked,
          converted: updated.converted,
        });
      } catch {
        // Socket.io not yet initialized — ignore during startup
      }

      // Mark campaign COMPLETED if all messages have a final status
      const statusCounts = await messageStatusModel.countByStatus(campaignId);
      const inProgress = statusCounts.find((s) => s.status === 'QUEUED' || s.status === 'SENT');
      if (!inProgress && (updated.delivered > 0 || updated.failed > 0)) {
        if (updated.status !== 'COMPLETED') {
          await campaignModel.updateStatus(campaignId, 'COMPLETED', { completedAt: new Date() });
          await campaignModel.addTimeline(campaignId, 'completed', 'All messages processed');
        }
      }
    } catch (err) {
      console.error(`[Receipts] Failed to update metrics for campaign ${campaignId}:`, err.message);
    }
  }
}

module.exports = { processReceipts };
