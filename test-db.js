require('dotenv').config();
const { prisma } = require('./src/config/db');

async function test() {
  try {
    await prisma.$connect();
    const count = await prisma.customer.count();
    console.log(`✅ DB connected! Customers in DB: ${count}`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ DB error:', e.message);
    process.exit(1);
  }
}
test();
