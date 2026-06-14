// src/middleware/validate.js
// Zod request validation middleware — validates req.body against a Zod schema.

const { z } = require('zod');

/**
 * @param {import('zod').ZodSchema} schema
 * @returns Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ success: false, error: 'Validation failed', errors });
    }
    req.body = result.data; // replace with parsed + coerced data
    next();
  };
}

module.exports = { validate };
