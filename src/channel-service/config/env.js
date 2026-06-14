// src/channel-service/config/env.js
// Validates and exports env vars for the Channel Service process.

require('dotenv').config();

const required = ['REDIS_URL', 'CRM_CALLBACK_URL'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`❌ [Channel-Service] Missing required env var: ${key}`);
  }
}

module.exports = {
  PORT: parseInt(process.env.CHANNEL_SERVICE_PORT) || 5001,
  REDIS_URL: process.env.REDIS_URL,
  CRM_CALLBACK_URL: process.env.CRM_CALLBACK_URL,
  // Simulation tuning — configurable via env for easy demos
  FAILURE_RATE: parseFloat(process.env.FAILURE_RATE) || 0.05,          // 5% failure
  DELIVERY_DELAY_MIN: parseInt(process.env.DELIVERY_DELAY_MIN) || 50,  // ms
  DELIVERY_DELAY_MAX: parseInt(process.env.DELIVERY_DELAY_MAX) || 200, // ms
  NODE_ENV: process.env.NODE_ENV || 'development',
};
