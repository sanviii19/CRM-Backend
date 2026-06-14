// src/channel-service/controllers/channelController.js
// Handles req/res for Channel Service endpoints.

const { asyncHandler } = require('../middleware/asyncHandler');
const { enqueueBatch } = require('../services/queueService');
const { jobModel } = require('../models/jobModel');
const { messageQueue } = require('../queue/messageQueue');

/**
 * POST /api/send
 * Accepts a batch of messages from the CRM and enqueues them for async delivery.
 *
 * Body: {
 *   campaignId: string,
 *   callbackUrl: string,
 *   messages: Array<{ messageId, customerId, channel, content }>
 * }
 */
const sendMessages = asyncHandler(async (req, res) => {
  const { campaignId, callbackUrl, messages } = req.body;

  if (!campaignId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'campaignId and a non-empty messages array are required',
    });
  }

  const result = await enqueueBatch(campaignId, messages, callbackUrl);

  res.status(202).json({
    success: true,
    status: 'accepted',
    ...result,
    message: `${result.queued} messages queued for async delivery`,
  });
});

/**
 * GET /api/status/:messageId
 * Returns the current delivery status of a message.
 */
const getStatus = asyncHandler(async (req, res) => {
  const job = jobModel.get(req.params.messageId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Message not found' });
  }
  res.json({ success: true, data: job });
});

/**
 * GET /api/health
 * Health check + queue stats.
 */
const healthCheck = asyncHandler(async (req, res) => {
  const [waiting, active, completed, failed] = await Promise.all([
    messageQueue.getWaitingCount(),
    messageQueue.getActiveCount(),
    messageQueue.getCompletedCount(),
    messageQueue.getFailedCount(),
  ]);

  res.json({
    success: true,
    status: 'ok',
    service: 'channel-service',
    timestamp: new Date().toISOString(),
    queue: { waiting, active, completed, failed },
    memory: jobModel.stats(),
  });
});

module.exports = { sendMessages, getStatus, healthCheck };
