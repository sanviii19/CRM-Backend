// src/routes/aiRoutes.js
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { aiParseSegmentSchema, aiGenerateCopySchema, aiGenerateStrategySchema } = require('../validators/segmentValidator');
const { parseSegment, generateCopy, generateStrategy } = require('../controllers/aiController');

const router = Router();

router.post('/parse-segment', validate(aiParseSegmentSchema), parseSegment);
router.post('/generate-copy', validate(aiGenerateCopySchema), generateCopy);
router.post('/generate-strategy', validate(aiGenerateStrategySchema), generateStrategy);

module.exports = router;
