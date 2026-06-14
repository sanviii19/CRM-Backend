// src/controllers/orderController.js
// Handles req/res for order-related endpoints.

const { asyncHandler } = require('../middleware/asyncHandler');
const { orderModel } = require('../models/orderModel');

/**
 * GET /api/orders
 * List orders with pagination.
 */
const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const skip = (page - 1) * limit;
  const where = {};
  if (req.query.customerId) where.customerId = req.query.customerId;

  const orders = await orderModel.findMany({ skip, take: limit, where });
  res.json({ success: true, data: orders });
});

/**
 * GET /api/orders/customer/:customerId
 * Get all orders for a specific customer.
 */
const getOrdersByCustomer = asyncHandler(async (req, res) => {
  const orders = await orderModel.findByCustomer(req.params.customerId);
  res.json({ success: true, data: orders });
});

/**
 * POST /api/orders
 * Create a single order with items.
 */
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.create(req.body);
  res.status(201).json({ success: true, data: order });
});

/**
 * POST /api/orders/bulk
 * Bulk ingest orders. Creates each order with its items sequentially.
 * Note: For large batches, batched Promises are used for efficiency.
 */
const bulkCreateOrders = asyncHandler(async (req, res) => {
  const { orders } = req.body;

  const CHUNK = 50;
  let created = 0;
  for (let i = 0; i < orders.length; i += CHUNK) {
    const chunk = orders.slice(i, i + CHUNK);
    await Promise.all(chunk.map((o) => orderModel.create(o)));
    created += chunk.length;
  }

  res.status(201).json({
    success: true,
    message: `Ingested ${created} orders`,
    count: created,
  });
});

module.exports = { listOrders, getOrdersByCustomer, createOrder, bulkCreateOrders };
