// src/models/campaignModel.js
// Model layer — ONLY Prisma DB access, zero business logic.

const { prisma } = require('../config/db');

const campaignModel = {
  /**
   * Create a new campaign record.
   */
  create: (data) => prisma.campaign.create({ data }),

  /**
   * Find a campaign by ID with full details.
   */
  findById: (id) =>
    prisma.campaign.findUnique({
      where: { id },
      include: {
        timeline: { orderBy: { timestamp: 'desc' } },
        _count: { select: { messageStatuses: true } },
      },
    }),

  /**
   * List all campaigns (most recent first).
   */
  findMany: ({ skip = 0, take = 20 } = {}) =>
    prisma.campaign.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messageStatuses: true } } },
    }),

  /**
   * Count all campaigns.
   */
  count: () => prisma.campaign.count(),

  /**
   * Update campaign status.
   */
  updateStatus: (id, status, extra = {}) =>
    prisma.campaign.update({ where: { id }, data: { status, ...extra } }),

  /**
   * Increment campaign metrics atomically.
   * @param {string} id
   * @param {Record<string, number>} increments e.g. { delivered: 5, failed: 1 }
   */
  incrementMetrics: (id, increments) => {
    const data = Object.fromEntries(
      Object.entries(increments).map(([key, val]) => [key, { increment: val }])
    );
    return prisma.campaign.update({ where: { id }, data });
  },

  /**
   * Add a timeline event for a campaign.
   */
  addTimeline: (campaignId, event, detail) =>
    prisma.campaignTimeline.create({ data: { campaignId, event, detail } }),

  /**
   * Get overview stats for the dashboard.
   */
  getDashboardStats: async () => {
    const [total, active, completed, totalMessages, aggregates] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'PROCESSING' } }),
      prisma.campaign.count({ where: { status: 'COMPLETED' } }),
      prisma.messageStatus.count(),
      prisma.campaign.aggregate({
        _sum: {
          sent: true,
          delivered: true,
          opened: true,
          clicked: true,
          converted: true,
          failed: true,
        }
      })
    ]);
    return { 
      total, 
      active, 
      completed, 
      totalMessages,
      globalMetrics: aggregates._sum
    };
  },

  /**
   * Compute rich analytics for the Insights page.
   */
  getInsights: async () => {
    // All completed campaigns with metrics
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'COMPLETED', delivered: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, channels: true, audienceSize: true,
        sent: true, delivered: true, opened: true, clicked: true,
        converted: true, failed: true, createdAt: true,
      },
    });

    if (campaigns.length === 0) {
      return {
        bestCampaign: null,
        bestChannel: null,
        openRateTrend: [],
        conversionTrend: [],
        totalCampaigns: 0,
      };
    }

    // Best Performing Campaign — highest conversion rate
    const withRates = campaigns.map(c => ({
      ...c,
      openRate:       c.delivered > 0 ? (c.opened    / c.delivered) * 100 : 0,
      conversionRate: c.delivered > 0 ? (c.converted / c.delivered) * 100 : 0,
      clickRate:      c.delivered > 0 ? (c.clicked   / c.delivered) * 100 : 0,
      deliveryRate:   c.sent      > 0 ? (c.delivered / c.sent)      * 100 : 0,
    }));

    const bestCampaign = withRates.reduce((best, c) =>
      c.conversionRate > best.conversionRate ? c : best, withRates[0]);

    // Best Channel — aggregate metrics by channel
    const channelStats = {};
    for (const c of withRates) {
      for (const ch of c.channels) {
        if (!channelStats[ch]) {
          channelStats[ch] = { channel: ch, totalDelivered: 0, totalOpened: 0, totalConverted: 0, count: 0 };
        }
        channelStats[ch].totalDelivered  += c.delivered;
        channelStats[ch].totalOpened     += c.opened;
        channelStats[ch].totalConverted  += c.converted;
        channelStats[ch].count           += 1;
      }
    }
    const channelList = Object.values(channelStats).map(ch => ({
      ...ch,
      openRate:       ch.totalDelivered > 0 ? (ch.totalOpened    / ch.totalDelivered) * 100 : 0,
      conversionRate: ch.totalDelivered > 0 ? (ch.totalConverted / ch.totalDelivered) * 100 : 0,
    }));
    const bestChannel = channelList.sort((a, b) => b.conversionRate - a.conversionRate)[0] || null;

    // Trend data — chronological, one data point per campaign
    const openRateTrend = withRates.map(c => ({
      label: c.name.length > 20 ? c.name.slice(0, 20) + '…' : c.name,
      date:  c.createdAt,
      value: parseFloat(c.openRate.toFixed(1)),
    }));

    const conversionTrend = withRates.map(c => ({
      label: c.name.length > 20 ? c.name.slice(0, 20) + '…' : c.name,
      date:  c.createdAt,
      value: parseFloat(c.conversionRate.toFixed(1)),
    }));

    return {
      bestCampaign: {
        ...bestCampaign,
        openRate:       parseFloat(bestCampaign.openRate.toFixed(1)),
        conversionRate: parseFloat(bestCampaign.conversionRate.toFixed(1)),
        clickRate:      parseFloat(bestCampaign.clickRate.toFixed(1)),
        deliveryRate:   parseFloat(bestCampaign.deliveryRate.toFixed(1)),
      },
      bestChannel,
      openRateTrend,
      conversionTrend,
      totalCampaigns: campaigns.length,
    };
  },
};

module.exports = { campaignModel };
