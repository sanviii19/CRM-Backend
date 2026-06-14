// src/controllers/campaignController.js
// Handles req/res for campaign-related endpoints.

const { asyncHandler } = require('../middleware/asyncHandler');
const campaignService = require('../services/campaignService');
const { messageStatusModel } = require('../models/messageStatusModel');

/**
 * POST /api/campaigns
 * Create + launch a new campaign.
 */
const createCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.launchCampaign(req.body);

  res.status(201).json({
    success: true,
    data: {
      campaignId: campaign.id,
      name: campaign.name,
      audienceSize: campaign.audienceSize,
      status: campaign.status,
    },
    message: `Campaign launched! Dispatching to ${campaign.audienceSize} customers.`,
  });
});

/**
 * GET /api/campaigns
 * List all campaigns with pagination.
 */
const listCampaigns = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const result = await campaignService.listCampaigns({ skip, take: limit });
  res.json({ success: true, ...result });
});

/**
 * GET /api/campaigns/:id
 * Get campaign details with metrics and timeline.
 */
const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.getById(req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
  res.json({ success: true, data: campaign });
});

/**
 * GET /api/campaigns/:id/messages
 * Get paginated message statuses for a campaign.
 */
const getCampaignMessages = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const skip = (page - 1) * limit;
  const { status } = req.query;

  const messages = await messageStatusModel.findByCampaign(req.params.id, {
    skip,
    take: limit,
    status: status?.toUpperCase(),
  });

  const counts = await messageStatusModel.countByStatus(req.params.id);

  res.json({
    success: true,
    data: messages,
    statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count.status])),
    pagination: { page, limit, skip },
  });
});

module.exports = { createCampaign, listCampaigns, getCampaign, getCampaignMessages };
