// src/services/segmentService.js
// Business logic for segment query validation and execution.

const { segmentModel } = require('../models/segmentModel');

// Forbidden SQL keywords that must never appear in AI-generated queries
const FORBIDDEN_PATTERNS = [
  /\bdrop\b/i,
  /\bdelete\b/i,
  /\bupdate\b/i,
  /\binsert\b/i,
  /\btruncate\b/i,
  /\balter\b/i,
  /\bcreate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bexec\b/i,
  /\bexecute\b/i,
  /--/,     // SQL comments (could hide malicious clauses)
  /;.*\S/,  // Multiple statements
];

/**
 * Validate a SQL segment query for safety.
 * Returns { valid: bool, reason: string }
 */
function validateSql(sql) {
  const normalized = sql.trim().toLowerCase();

  if (!normalized.startsWith('select')) {
    return { valid: false, reason: 'Only SELECT queries are allowed' };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sql)) {
      return { valid: false, reason: `Forbidden SQL pattern detected: ${pattern}` };
    }
  }

  return { valid: true };
}

/**
 * Preview a segment — execute the SQL and return count + sample.
 * @param {string} sql - Parameterized SELECT SQL
 * @param {unknown[]} params - Parameter values
 * @returns {{ count: number, sample: Array, sql: string }}
 */
async function previewSegment(sql, params = []) {
  const validation = validateSql(sql);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.reason), { status: 400 });
  }

  const results = await segmentModel.executeRaw(sql, params);

  return {
    count: results.length,
    sample: results.slice(0, 10),
  };
}

module.exports = { previewSegment, validateSql };
