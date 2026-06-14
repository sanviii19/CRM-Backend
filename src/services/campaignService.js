// src/services/campaignService.js
// Business logic for campaign creation, launching, and retrieval.

const { campaignModel } = require('../models/campaignModel');
const { messageStatusModel } = require('../models/messageStatusModel');
const { segmentModel } = require('../models/segmentModel');
const { validateSql } = require('./segmentService');
const { channelService } = require('./channelService');

/**
 * Personalize a message template with customer data.
 * Replaces {name}, {city}, {totalSpent}, {daysSinceLastOrder} placeholders.
 */
function personalizeTemplate(template, customer) {
  const daysSinceLastOrder = customer.lastOrderAt
    ? Math.floor((Date.now() - new Date(customer.lastOrderAt)) / 86400000)
    : null;

  return template
    .replace(/{name}/g, customer.name || 'Valued Customer')
    .replace(/{city}/g, customer.city || '')
    .replace(/{totalSpent}/g, customer.totalSpent ? `₹${customer.totalSpent.toFixed(0)}` : '')
    .replace(/{daysSinceLastOrder}/g, daysSinceLastOrder !== null ? String(daysSinceLastOrder) : '')
    .replace(/{email}/g, customer.email || '');
}

/**
 * Launch a campaign — executes the segment query, bulk-creates message records,
 * logs a timeline event, and fires off to the Channel Service.
 */
async function launchCampaign({ name, segmentQuery, messageTemplate, channels }) {
  const { sql, params = [], segmentName } = segmentQuery;

  // Security: validate query before execution
  const validation = validateSql(sql);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.reason), { status: 400 });
  }

  // Execute segment query to get audience
  const customers = await segmentModel.executeRaw(sql, params);

  if (customers.length === 0) {
    console.error('[Campaign Launch] Segment returned 0 customers.');
    console.error('[Campaign Launch] SQL:', sql);
    console.error('[Campaign Launch] Params:', JSON.stringify(params));
    throw Object.assign(
      new Error('Segment returned 0 customers. The targeting criteria matched no one in the database. Check the audience SQL or adjust your targeting.'),
      { status: 422 }
    );
  }

  // Create campaign record
  const campaign = await campaignModel.create({
    name,
    segmentQuery,
    segmentName: segmentName || 'Custom Segment',
    messageTemplate,
    channels,
    status: 'PROCESSING',
    audienceSize: customers.length,
    queued: customers.length * channels.length,
  });

  // Bulk create message status records — one for each channel per customer
  const messagesToCreate = [];
  for (const c of customers) {
    for (const channel of channels) {
      messagesToCreate.push({
        campaignId: campaign.id,
        customerId: c.id,
        messageId: `${campaign.id}-${c.id}-${channel}`, // idempotency key with channel
        channel,
        content: personalizeTemplate(messageTemplate, c),
        status: 'QUEUED',
      });
    }
  }

  await messageStatusModel.bulkCreate(messagesToCreate);

  // Log campaign timeline event (non-blocking)
  campaignModel
    .addTimeline(campaign.id, 'launched', `${customers.length} messages queued`)
    .catch(console.error);

  // Fire off to Channel Service asynchronously (don't block the response)
  setImmediate(() => {
    channelService.sendBatch(campaign.id).catch((err) => {
      console.error(`[Campaign ${campaign.id}] Channel service dispatch failed:`, err.message);
      campaignModel.addTimeline(campaign.id, 'error', `Channel dispatch failed: ${err.message}`).catch(() => {});
    });
  });

  return campaign;
}

/**
 * Get full campaign details including metrics and timeline.
 */
async function getById(id) {
  return campaignModel.findById(id);
}

/**
 * List campaigns with pagination.
 */
async function listCampaigns({ skip = 0, take = 20 } = {}) {
  const [campaigns, total] = await Promise.all([
    campaignModel.findMany({ skip, take }),
    campaignModel.count(),
  ]);
  return { campaigns, total, skip, take };
}

module.exports = { launchCampaign, getById, listCampaigns, personalizeTemplate };
