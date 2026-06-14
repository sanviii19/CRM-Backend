// src/controllers/receiptController.js
// Handles incoming webhook receipts from the Channel Service.

const { asyncHandler } = require('../middleware/asyncHandler');
const { processReceipts } = require('../services/receiptService');

/**
 * POST /api/receipts
 * Webhook endpoint called by Channel Service with batched delivery status updates.
 * Responds immediately and processes asynchronously to avoid blocking retries.
 */
const handleReceipts = asyncHandler(async (req, res) => {
  const { receipts } = req.body;

  if (!Array.isArray(receipts) || receipts.length === 0) {
    return res.status(400).json({ success: false, error: 'receipts must be a non-empty array' });
  }

  // Respond immediately — avoids timeout retries from Channel Service
  res.json({ success: true, received: receipts.length });

  // Process receipts asynchronously after response is sent
  setImmediate(() => {
    processReceipts(receipts).catch((err) => {
      console.error('[Receipts] Processing error:', err.message);
    });
  });
});

module.exports = { handleReceipts };
