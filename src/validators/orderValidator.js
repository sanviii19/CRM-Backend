// src/validators/orderValidator.js
const { z } = require('zod');

const orderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  price: z.number().positive(),
});

const orderSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  status: z.enum(['PENDING', 'COMPLETED', 'REFUNDED']).default('COMPLETED'),
  purchasedAt: z.string().datetime().or(z.date()).transform((v) => new Date(v)),
  orderItems: z.array(orderItemSchema).min(1),
});

const bulkOrderSchema = z.object({
  orders: z.array(orderSchema).min(1).max(5000),
});

module.exports = { orderSchema, bulkOrderSchema };
