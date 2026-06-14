// src/validators/customerValidator.js
const { z } = require('zod');

const customerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional().nullable(),
});

const bulkCustomerSchema = z.object({
  customers: z.array(customerSchema).min(1).max(1000),
});

module.exports = { customerSchema, bulkCustomerSchema };
