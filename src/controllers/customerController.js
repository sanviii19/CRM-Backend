// src/controllers/customerController.js
// Handles req/res for customer-related endpoints. Calls services/models directly.

const { asyncHandler } = require('../middleware/asyncHandler');
const { customerModel } = require('../models/customerModel');

/**
 * GET /api/customers
 * List customers with pagination and optional city/tag filters.
 */
const listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.city) where.city = req.query.city;
  if (req.query.tag) where.tags = { has: req.query.tag };
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: 'insensitive' } },
      { email: { contains: req.query.search, mode: 'insensitive' } },
      { phone: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    customerModel.findMany({ where, skip, take: limit }),
    customerModel.count(where),
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/customers/:id
 * Get a single customer with their recent orders.
 */
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerModel.findById(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  res.json({ success: true, data: customer });
});

/**
 * POST /api/customers
 * Create a single customer.
 */
const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerModel.create(req.body);
  res.status(201).json({ success: true, data: customer });
});

/**
 * POST /api/customers/bulk
 * Bulk ingest up to 1000 customers. Skips duplicates by email.
 */
const bulkCreateCustomers = asyncHandler(async (req, res) => {
  const { customers } = req.body;
  const result = await customerModel.bulkCreate(customers);
  res.status(201).json({
    success: true,
    message: `Ingested ${result.count} customers`,
    count: result.count,
  });
});

module.exports = { listCustomers, getCustomer, createCustomer, bulkCreateCustomers };
