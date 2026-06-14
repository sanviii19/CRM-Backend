// src/models/segmentModel.js
// Model layer — Executes parameterized raw SQL queries for segment previews.

const { prisma } = require('../config/db');

const segmentModel = {
  /**
   * Execute a parameterized SQL segment query.
   * Only SELECT is allowed — validated before calling this.
   * @param {string} sql - Parameterized SQL SELECT statement
   * @param {unknown[]} params - Parameter values ($1, $2 ...)
   * @returns {Promise<Array>}
   */
  executeRaw: (sql, params = []) => {
    // Auto-fix Postgres enum casting issues (e.g., status = $1 -> status = $1::"OrderStatus")
    const fixedSql = sql.replace(/(\bstatus\s*=\s*\$\d+)(?!::)/gi, '$1::"OrderStatus"');
    return prisma.$queryRawUnsafe(fixedSql, ...params);
  },
};

module.exports = { segmentModel };
