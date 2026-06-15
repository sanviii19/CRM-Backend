const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.count();
  const customers = await prisma.customer.count();
  console.log(`Campaigns: ${campaigns}, Customers: ${customers}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
