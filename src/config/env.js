// src/config/env.js
// Validates and exports all environment variables at startup.
// Fails fast with a clear error if anything is missing.

require('dotenv').config();

const required = ['DATABASE_URL', 'CHANNEL_SERVICE_URL', 'CRM_URL'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  CHANNEL_SERVICE_URL: process.env.CHANNEL_SERVICE_URL,
  CRM_URL: process.env.CRM_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
