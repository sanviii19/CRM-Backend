// src/controllers/segmentController.js
// Handles req/res for segment preview endpoints.

const { asyncHandler } = require('../middleware/asyncHandler');
const { previewSegment } = require('../services/segmentService');

const { prisma } = require('../config/db');

/**
 * POST /api/segments/preview
 * Execute a segment SQL query and return count + sample customers.
 */
const previewSegmentHandler = asyncHandler(async (req, res) => {
  const { sql, params = [] } = req.body;
  const result = await previewSegment(sql, params);
  res.json({ success: true, ...result });
});

/**
 * POST /api/segments
 * Save an audience segment query
 */
const saveSegment = asyncHandler(async (req, res) => {
  const { name, sql, params } = req.body;

  const validation = await previewSegment(sql, params).catch(e => ({ error: true, msg: e.message }));
  if (validation.error) {
    throw Object.assign(new Error(`Invalid segment: ${validation.msg}`), { status: 400 });
  }

  const segment = await prisma.segment.create({
    data: { name, sql, params }
  });

  res.status(201).json({ success: true, data: segment });
});

/**
 * GET /api/segments
 * List saved audience segments — fast, no previews.
 */
const listSegments = asyncHandler(async (req, res) => {
  const segments = await prisma.segment.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: segments });
});

/**
 * GET /api/segments/:id/stats
 * Run the segment SQL and return live customer stats for a single segment card.
 * Called per-card by the frontend (lazy, independent).
 */
const getSegmentStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seg = await prisma.segment.findUnique({ where: { id } });
  if (!seg) throw Object.assign(new Error('Segment not found'), { status: 404 });

  // Prisma JSON comes back as a parsed value — ensure it's an array
  const safeParams = Array.isArray(seg.params)
    ? seg.params
    : typeof seg.params === 'object' && seg.params !== null
    ? Object.values(seg.params)
    : [];

  const preview = await previewSegment(seg.sql, safeParams);

  const cities = [...new Set(
    preview.sample.map((c) => c.city).filter(Boolean)
  )].slice(0, 3);

  const sampleCustomers = preview.sample.slice(0, 4).map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
  }));

  res.json({
    success: true,
    data: {
      count: preview.count,
      cities,
      sampleCustomers,
    },
  });
});

/**
 * DELETE /api/segments/:id
 * Remove a saved audience segment
 */
const deleteSegment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.segment.delete({ where: { id } });
  res.json({ success: true, message: 'Segment deleted' });
});

module.exports = { previewSegmentHandler, saveSegment, listSegments, getSegmentStats, deleteSegment };
