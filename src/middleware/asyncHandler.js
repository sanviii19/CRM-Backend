// src/middleware/asyncHandler.js
// Wraps async route controllers — eliminates try/catch boilerplate everywhere.

/**
 * @param {Function} fn - Async express route handler
 * @returns Express middleware that forwards errors to next()
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };
