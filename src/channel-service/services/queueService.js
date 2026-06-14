// src/channel-service/services/queueService.js
// Enqueues messages into the BullMQ queue.

const { messageQueue } = require('../queue/messageQueue');
const { jobModel } = require('../models/jobModel');

/**
 * Enqueue a batch of messages.
 * Each message becomes a separate BullMQ job.
 *
 * @param {string} campaignId
 * @param {Array<{ messageId, customerId, channel, content }>} messages
 * @param {string} callbackUrl - CRM webhook URL
 * @returns {Promise<{ queued: number }>}
 */
async function enqueueBatch(campaignId, messages, callbackUrl) {
  const jobs = messages.map((msg) => ({
    name: 'deliver',
    data: {
      messageId: msg.messageId,
      customerId: msg.customerId,
      campaignId,
      channel: msg.channel,
      content: msg.content,
      callbackUrl,
    },
    opts: {
      jobId: msg.messageId, // Idempotency — duplicate messageIds are ignored
    },
  }));

  await messageQueue.addBulk(jobs);

  // Track initial QUEUED state in memory
  for (const msg of messages) {
    jobModel.set(msg.messageId, {
      messageId: msg.messageId,
      customerId: msg.customerId,
      campaignId,
      channel: msg.channel,
      status: 'QUEUED',
    });
  }

  console.log(`[Queue] Enqueued ${messages.length} messages for campaign ${campaignId}`);
  return { queued: messages.length };
}

module.exports = { enqueueBatch };
