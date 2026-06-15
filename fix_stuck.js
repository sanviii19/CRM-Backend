const { prisma } = require('./src/config/db');

async function fixStuckMessages() {
  const stuckMessages = await prisma.messageStatus.findMany({ where: { status: 'SENT' } });
  console.log(`Found ${stuckMessages.length} stuck SENT messages.`);
  for (const m of stuckMessages) {
    await prisma.campaign.update({
      where: { id: m.campaignId },
      data: { failed: { increment: 1 } }
    });
    await prisma.messageStatus.update({
      where: { messageId: m.messageId },
      data: { status: 'FAILED' }
    });
  }
  
  const campaigns = [...new Set(stuckMessages.map(m => m.campaignId))];
  for (const cid of campaigns) {
    const statusCounts = await prisma.messageStatus.groupBy({
      by: ['status'],
      where: { campaignId: cid },
      _count: { status: true },
    });
    const inProgress = statusCounts.find((s) => s.status === 'QUEUED' || s.status === 'SENT');
    if (!inProgress) {
      const c = await prisma.campaign.findUnique({ where: { id: cid } });
      if (c.status !== 'COMPLETED') {
        await prisma.campaign.update({
          where: { id: cid },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
        await prisma.campaignTimeline.create({
          data: { campaignId: cid, event: 'completed', detail: 'All messages processed' }
        });
        console.log(`Marked campaign ${cid} as COMPLETED.`);
      }
    }
  }
}

fixStuckMessages()
  .then(() => console.log('Done'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
