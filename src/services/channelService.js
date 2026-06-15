// src/services/channelService.js
// HTTP client that dispatches message batches to the Channel Service.

const axios = require('axios');
const { CHANNEL_SERVICE_URL, CRM_URL } = require('../config/env');

const BATCH_SIZE = 500; // messages per HTTP call to channel service

/**
 * Send all QUEUED messages for a campaign to the Channel Service in batches.
 * @param {string} campaignId
 */
async function sendBatch(campaignId) {
  // Late require to avoid circular dependency
  const { messageStatusModel } = require('../models/messageStatusModel');
  const { campaignModel } = require('../models/campaignModel');

  const messages = await messageStatusModel.findQueued(campaignId);

  if (messages.length === 0) {
    console.warn(`[ChannelService] No queued messages found for campaign ${campaignId}`);
    return;
  }

  console.log(`[ChannelService] Dispatching ${messages.length} messages in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      await axios.post(
        `${CHANNEL_SERVICE_URL}/api/send`,
        {
          campaignId,
          callbackUrl: `${CRM_URL}/api/receipts`,
          messages: batch.map((m) => ({
            messageId: m.messageId,
            customerId: m.customerId,
            channel: m.channel,
            content: m.content,
          })),
        },
        { timeout: 60000 }
      );
      console.log(`[ChannelService] Batch ${Math.floor(i / BATCH_SIZE) + 1} dispatched (${batch.length} messages)`);
    } catch (err) {
      console.error(`[ChannelService] Batch dispatch failed:`, err.message);
      // Log to campaign timeline but don't crash — channel service will retry
      await campaignModel
        .addTimeline(campaignId, 'batch_error', `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message}`)
        .catch(() => {});
    }
  }
}

module.exports = { channelService: { sendBatch } };
