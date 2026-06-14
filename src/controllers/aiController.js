// src/controllers/aiController.js
// Handles req/res for AI Copilot endpoints.

const { asyncHandler } = require('../middleware/asyncHandler');
const { parseSegmentIntent, generateCampaignCopy, generateCampaignStrategy } = require('../services/aiService');
const { previewSegment } = require('../services/segmentService');

/**
 * POST /api/ai/parse-segment
 * Takes a plain-English description and returns a parameterized SQL query + message template.
 */
const parseSegment = asyncHandler(async (req, res) => {
  const { prompt } = req.body;

  const result = await parseSegmentIntent(prompt);

  // Auto-preview the generated segment
  let preview = null;
  try {
    preview = await previewSegment(result.sql, result.params);
  } catch (err) {
    console.warn('[AI] Segment preview failed:', err.message);
    preview = { count: null, sample: [], error: err.message };
  }

  res.json({
    success: true,
    data: {
      ...result,
      preview,
    },
  });
});

/**
 * POST /api/ai/generate-copy
 * Generates a marketing message for a given segment + channel + tone.
 */
const generateCopy = asyncHandler(async (req, res) => {
  const { segmentName, channel, tone } = req.body;
  const copy = await generateCampaignCopy(segmentName, channel, tone);
  res.json({ success: true, data: copy });
});

/**
 * POST /api/ai/generate-strategy
 * Generates an audience segment, channel suggestion, and message copy based on goal, offer, and tone.
 */
const generateStrategy = asyncHandler(async (req, res) => {
  const { targetAudience, goal, tone, savedSegment } = req.body;
  const strategy = await generateCampaignStrategy(targetAudience, goal, tone, savedSegment);
  res.json({ success: true, data: strategy });
});

module.exports = { parseSegment, generateCopy, generateStrategy };
