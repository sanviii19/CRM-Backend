// src/routes/receiptRoutes.js
const { Router } = require('express');
const { handleReceipts } = require('../controllers/receiptController');

const router = Router();

router.post('/', handleReceipts);

module.exports = router;
