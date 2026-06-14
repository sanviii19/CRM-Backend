// src/models/messageStatusModel.js
// Model layer — ONLY Prisma DB access for message statuses and history.

const { prisma } = require('../config/db');

const messageStatusModel = {
  /**
   * Bulk insert message status records — single DB round trip.
   * skipDuplicates ensures idempotency on retry.
   */
  bulkCreate: (data) =>
    prisma.messageStatus.createMany({ data, skipDuplicates: true }),

  /**
   * Update a single message status + append to history (in one transaction).
   */
  updateStatus: (messageId, status, timestamp, reason = null) =>
    prisma.messageStatus.update({
      where: { messageId },
      data: {
        status,
        ...(reason && { failureReason: reason }),
        updatedAt: timestamp ? new Date(timestamp) : new Date(),
        history: {
          create: { 
            status, 
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            ...(reason && { failureReason: reason })
          },
        },
      },
      select: { id: true, campaignId: true, customerId: true, status: true },
    }),

  /**
   * Find messages for a campaign with pagination.
   */
  findByCampaign: (campaignId, { skip = 0, take = 50, status } = {}) =>
    prisma.messageStatus.findMany({
      where: { campaignId, ...(status && { status }) },
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, city: true } },
        history: { orderBy: { timestamp: 'asc' } },
      },
    }),

  /**
   * Count messages for a campaign grouped by status.
   */
  countByStatus: (campaignId) =>
    prisma.messageStatus.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    }),

  /**
   * Get all QUEUED messages for a campaign (to send to channel service).
   */
  findQueued: (campaignId) =>
    prisma.messageStatus.findMany({
      where: { campaignId, status: 'QUEUED' },
      select: {
        messageId: true,
        customerId: true,
        channel: true,
        content: true,
      },
    }),
};

module.exports = { messageStatusModel };
