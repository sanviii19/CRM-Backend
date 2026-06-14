// src/channel-service/utils/retry.js
// Exponential backoff HTTP retry helper for webhook callbacks.

const axios = require('axios');

/**
 * Sends an HTTP POST with exponential backoff retry.
 * Used by the dispatcher to send receipt batches to the CRM.
 *
 * @param {string} url
 * @param {object} payload
 * @param {number} attempt - current attempt (1-indexed)
 * @param {number} maxAttempts
 */
async function sendWithRetry(url, payload, attempt = 1, maxAttempts = 4) {
  try {
    await axios.post(url, payload, { timeout: 5000 });
  } catch (err) {
    if (attempt >= maxAttempts) {
      console.error(`[Dispatcher] Retry exhausted after ${maxAttempts} attempts → ${url}`);
      return;
    }
    const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s, 4s
    console.warn(`[Dispatcher] Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
    await new Promise((r) => setTimeout(r, delay));
    return sendWithRetry(url, payload, attempt + 1, maxAttempts);
  }
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Random integer between min and max inclusive.
 */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { sendWithRetry, sleep, rand };
