const { prisma } = require('./src/config/db');
prisma.messageStatus.groupBy({ by: ['campaignId', 'status'], _count: { status: true } })
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
