// src/models/orderModel.js
// Model layer — ONLY Prisma DB access, zero business logic.

const { prisma } = require('../config/db');

const orderModel = {
  /**
   * Find orders for a specific customer.
   */
  findByCustomer: (customerId) =>
    prisma.order.findMany({
      where: { customerId },
      orderBy: { purchasedAt: 'desc' },
      include: { orderItems: true },
    }),

  /**
   * Create a single order with its items.
   */
  create: (data) =>
    prisma.order.create({
      data: {
        customerId: data.customerId,
        amount: data.amount,
        status: data.status || 'COMPLETED',
        purchasedAt: new Date(data.purchasedAt),
        orderItems: {
          create: data.orderItems,
        },
      },
      include: { orderItems: true },
    }),

  /**
   * Find all orders (with pagination).
   */
  findMany: ({ skip = 0, take = 50, where = {} } = {}) =>
    prisma.order.findMany({ where, skip, take, orderBy: { purchasedAt: 'desc' }, include: { orderItems: true } }),

  /**
   * Get aggregate stats per customer (total spend, order count, last order date).
   */
  getCustomerStats: async (customerId) => {
    const result = await prisma.order.aggregate({
      where: { customerId, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
      _max: { purchasedAt: true },
    });
    return {
      totalSpend: result._sum.amount || 0,
      orderCount: result._count.id || 0,
      lastOrderAt: result._max.purchasedAt,
    };
  },

  /**
   * Get total revenue influenced across all orders.
   */
  getTotalRevenue: async () => {
    const result = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  },
};

module.exports = { orderModel };
