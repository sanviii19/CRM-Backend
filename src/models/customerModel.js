// src/models/customerModel.js
// Model layer — ONLY Prisma DB access, zero business logic.

const { prisma } = require('../config/db');

const customerModel = {
  /**
   * Find multiple customers with optional filters, pagination, and sorting.
   */
  findMany: ({ where = {}, skip = 0, take = 50, orderBy = { createdAt: 'desc' } } = {}) =>
    prisma.customer.findMany({ where, skip, take, orderBy }),

  /**
   * Count customers matching a filter.
   */
  count: (where = {}) => prisma.customer.count({ where }),

  /**
   * Find a single customer by ID.
   */
  findById: (id) =>
    prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { purchasedAt: 'desc' },
          take: 10,
          include: { orderItems: true },
        },
        _count: { select: { orders: true } },
      },
    }),

  /**
   * Bulk insert customers — skips duplicates by email.
   */
  bulkCreate: (data) =>
    prisma.customer.createMany({ data, skipDuplicates: true }),

  /**
   * Create a single customer.
   */
  create: (data) => prisma.customer.create({ data }),

  /**
   * Update a customer.
   */
  update: (id, data) => prisma.customer.update({ where: { id }, data }),
};

module.exports = { customerModel };
