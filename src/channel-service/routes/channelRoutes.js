// src/channel-service/routes/channelRoutes.js
const { Router } = require('express');
const { sendMessages, getStatus, healthCheck } = require('../controllers/channelController');

const router = Router();

router.get('/health', healthCheck);
router.post('/send', sendMessages);
router.get('/status/:messageId', getStatus);

module.exports = router;
