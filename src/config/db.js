// src/config/db.js
// Prisma client singleton — prevents multiple connections during hot reload.

const { PrismaClient } = require('@prisma/client');

let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && process.env.NODE_ENV === 'production') {
  if (!databaseUrl.includes('connection_limit=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl += `${separator}connection_limit=1&pool_timeout=15`;
  }
}

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
