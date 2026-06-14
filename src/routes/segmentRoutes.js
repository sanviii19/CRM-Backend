// src/routes/segmentRoutes.js
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { previewSegmentSchema, saveSegmentSchema } = require('../validators/segmentValidator');
const { previewSegmentHandler, saveSegment, listSegments, deleteSegment, getSegmentStats } = require('../controllers/segmentController');

const router = Router();

router.get('/', listSegments);
router.post('/', validate(saveSegmentSchema), saveSegment);
router.post('/preview', validate(previewSegmentSchema), previewSegmentHandler);
router.get('/:id/stats', getSegmentStats);
router.delete('/:id', deleteSegment);

module.exports = router;
