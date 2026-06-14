// src/validators/campaignValidator.js
const { z } = require('zod');

const segmentQuerySchema = z.object({
  sql: z.string().min(10),
  params: z.array(z.unknown()).default([]),
  segmentName: z.string().optional(),
});

const campaignSchema = z.object({
  name: z.string().min(1).max(255),
  segmentQuery: segmentQuerySchema,
  messageTemplate: z.string().min(1),
  channels: z.array(z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'RCS'])).min(1),
});

module.exports = { campaignSchema, segmentQuerySchema };
