// src/channel-service/routes/index.js
const { Router } = require('express');
const channelRoutes = require('./channelRoutes');

const router = Router();
router.use('/api', channelRoutes);

module.exports = router;
