const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const c = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  console.log('Campaign:', c[0]);

  const s = await prisma.messageStatus.groupBy({
    by: ['status'],
    where: { campaignId: c[0].id },
    _count: { status: true }
  });
  console.log('Statuses:', s);

  const t = await prisma.campaignTimeline.findMany({
    where: { campaignId: c[0].id },
    orderBy: { timestamp: 'desc' },
    take: 5
  });
  console.log('Timeline:', t);
}

check().finally(() => prisma.$disconnect());
