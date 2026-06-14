// src/validators/segmentValidator.js
const { z } = require('zod');

const previewSegmentSchema = z.object({
  sql: z
    .string()
    .min(10)
    .refine((s) => s.trim().toLowerCase().startsWith('select'), {
      message: 'Only SELECT queries are allowed',
    }),
  params: z.array(z.unknown()).default([]),
});

const aiParseSegmentSchema = z.object({
  prompt: z.string().min(5).max(2000),
});

const aiGenerateCopySchema = z.object({
  segmentName: z.string().min(1),
  channel: z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'RCS']).default('SMS'),
  tone: z.enum(['friendly', 'urgent', 'professional', 'playful']).default('friendly'),
});

const aiGenerateStrategySchema = z.object({
  targetAudience: z.string().min(1),
  goal: z.string().min(1),
  tone: z.string().min(1).default('friendly'),
  savedSegment: z.object({
    id: z.string().optional(),
    name: z.string(),
    sql: z.string(),
    params: z.array(z.unknown()).default([]),
  }).optional().nullable(),
});

const saveSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  sql: z.string().min(10),
  params: z.array(z.unknown()).default([]),
});

module.exports = { previewSegmentSchema, saveSegmentSchema, aiParseSegmentSchema, aiGenerateCopySchema, aiGenerateStrategySchema };
