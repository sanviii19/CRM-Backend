// prisma/seedSegments.js
// Run: node prisma/seedSegments.js
// Seeds dummy audience segments — no AI tokens needed.
// Live customer counts & stats are fetched at runtime by the API.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DUMMY_SEGMENTS = [
  {
    name: 'High-Value Customers (₹10k+)',
    sql: `SELECT c.id, c.name, c.email, c.city FROM customers c WHERE (SELECT COALESCE(SUM(o.amount), 0) FROM orders o WHERE o."customerId" = c.id AND o.status = $1::"OrderStatus") >= $2`,
    params: ['COMPLETED', 10000],
  },
  {
    name: 'Inactive Customers (90+ Days)',
    sql: `SELECT c.id, c.name, c.email, c.city FROM customers c WHERE (SELECT MAX(o."purchasedAt") FROM orders o WHERE o."customerId" = c.id) < NOW() - INTERVAL '90 days' OR NOT EXISTS (SELECT 1 FROM orders o WHERE o."customerId" = c.id)`,
    params: [],
  },
  {
    name: 'New Customers (Last 30 Days)',
    sql: `SELECT c.id, c.name, c.email, c.city FROM customers c WHERE c."createdAt" >= NOW() - INTERVAL '30 days'`,
    params: [],
  },
  {
    name: 'Repeat Buyers (3+ Orders)',
    sql: `SELECT c.id, c.name, c.email, c.city FROM customers c WHERE (SELECT COUNT(*) FROM orders o WHERE o."customerId" = c.id AND o.status = $1::"OrderStatus") >= $2`,
    params: ['COMPLETED', 3],
  },
  {
    name: 'Mumbai Customers',
    sql: `SELECT c.id, c.name, c.email, c.city FROM customers c WHERE LOWER(c.city) = LOWER($1)`,
    params: ['Mumbai'],
  },
  {
    name: 'Customers with Refunds',
    sql: `SELECT DISTINCT c.id, c.name, c.email, c.city FROM customers c JOIN orders o ON o."customerId" = c.id WHERE o.status = $1::"OrderStatus"`,
    params: ['REFUNDED'],
  },
  {
    name: 'Big Spenders Last 60 Days',
    sql: `SELECT c.id, c.name, c.email, c.city FROM customers c WHERE (SELECT COALESCE(SUM(o.amount), 0) FROM orders o WHERE o."customerId" = c.id AND o."purchasedAt" >= NOW() - INTERVAL '60 days' AND o.status = $1::"OrderStatus") >= $2`,
    params: ['COMPLETED', 5000],
  },
  {
    name: 'One-Time Buyers (Never Returned)',
    sql: `SELECT c.id, c.name, c.email, c.city FROM customers c WHERE (SELECT COUNT(*) FROM orders o WHERE o."customerId" = c.id AND o.status = $1::"OrderStatus") = $2`,
    params: ['COMPLETED', 1],
  },
];

async function main() {
  console.log('🌱  Seeding segments...\n');

  const deleted = await prisma.segment.deleteMany({});
  if (deleted.count > 0) console.log(`  🗑️   Cleared ${deleted.count} existing segment(s)\n`);

  let created = 0;
  for (const seg of DUMMY_SEGMENTS) {
    try {
      await prisma.segment.create({
        data: {
          name:   seg.name,
          sql:    seg.sql.replace(/\s+/g, ' ').trim(),
          params: seg.params,
        },
      });
      console.log(`  ✅  Created: "${seg.name}"`);
      created++;
    } catch (err) {
      console.error(`  ❌  Error seeding "${seg.name}":`, err.message);
    }
  }

  console.log(`\n✨  Done! ${created} segments seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
