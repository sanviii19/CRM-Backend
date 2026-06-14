// src/routes/index.js
// Central router — mounts all feature routers under /api

const { Router } = require('express');

const customerRoutes = require('./customerRoutes');
const orderRoutes = require('./orderRoutes');
const campaignRoutes = require('./campaignRoutes');
const segmentRoutes = require('./segmentRoutes');
const receiptRoutes = require('./receiptRoutes');
const aiRoutes = require('./aiRoutes');
const { campaignModel } = require('../models/campaignModel');
const { customerModel } = require('../models/customerModel');
const { orderModel } = require('../models/orderModel');
const { generateAIInsights } = require('../services/aiService');

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'xeno-crm-backend' });
});

// Dashboard summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const [stats, recentCampaigns, totalCustomers, totalRevenue] = await Promise.all([
      campaignModel.getDashboardStats(),
      campaignModel.findMany({ skip: 0, take: 5 }),
      customerModel.count(),
      orderModel.getTotalRevenue(),
    ]);
    res.json({ success: true, data: { ...stats, totalCustomers, recentCampaigns, totalRevenue } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Feature routers
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/segments', segmentRoutes);
router.use('/receipts', receiptRoutes);
router.use('/ai', aiRoutes);

// Insights analytics endpoint
router.get('/insights', async (req, res) => {
  try {
    const data = await campaignModel.getInsights();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Insights summary — cached for 24 hours to conserve Gemini quota
const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let aiInsightsCache = { bullets: null, generatedAt: null };

router.get('/insights/ai-summary', async (req, res) => {
  try {
    const now = Date.now();
    const forceRefresh = req.query.force === 'true';
    const cacheAge = aiInsightsCache.generatedAt ? now - aiInsightsCache.generatedAt : Infinity;
    const isCacheValid = aiInsightsCache.bullets && cacheAge < AI_CACHE_TTL_MS;

    if (isCacheValid && !forceRefresh) {
      const nextRefreshMs = AI_CACHE_TTL_MS - cacheAge;
      return res.json({
        success: true,
        data: { bullets: aiInsightsCache.bullets, cached: true, nextRefreshIn: Math.round(nextRefreshMs / 1000 / 60) }
      });
    }

    const insightsData = await campaignModel.getInsights();
    if (insightsData.totalCampaigns === 0) {
      return res.json({ success: true, data: { bullets: [], cached: false } });
    }

    const bullets = await generateAIInsights(insightsData);

    // Store in cache
    aiInsightsCache = { bullets, generatedAt: now };
    console.log('[AI Insights] Cache refreshed at', new Date().toISOString());

    res.json({ success: true, data: { bullets, cached: false, nextRefreshIn: AI_CACHE_TTL_MS / 1000 / 60 } });
  } catch (err) {
    // On error, return stale cache if available rather than failing
    if (aiInsightsCache.bullets) {
      return res.json({ success: true, data: { bullets: aiInsightsCache.bullets, cached: true, stale: true } });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
