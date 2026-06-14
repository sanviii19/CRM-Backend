// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL || process.env.DIRECT_URL },
  },
  // Limit connections for Supabase pooler compatibility
  log: ['warn'],
});

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];
const categories = ['Sneakers', 'T-Shirts', 'Accessories', 'Jackets', 'Bags', 'Watches', 'Sunglasses'];
const loyaltyTiers = ['bronze', 'silver', 'gold', 'platinum'];
const tagOptions = ['vip', 'new', 'churned', 'active', 'loyal', 'at-risk', 'high-value'];

async function main() {
  require('dotenv').config();
  console.log('🌱 Seeding Xeno CRM database...');

  // Clear existing data
  await prisma.messageHistory.deleteMany();
  await prisma.messageStatus.deleteMany();
  await prisma.campaignTimeline.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  console.log('🗑️  Cleared existing data');

  // ── Create 500 customers in a single bulk insert ───────────────────────────
  const customerData = Array.from({ length: 500 }, () => {
    const loyaltyTier = faker.helpers.arrayElement(loyaltyTiers);
    const loyaltyPoints = faker.number.int({ min: 0, max: 5000 });
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: `+91${faker.string.numeric(10)}`,
      city: faker.helpers.arrayElement(cities),
      tags: faker.helpers.arrayElements(tagOptions, faker.number.int({ min: 1, max: 3 })),
      metadata: {
        age: faker.number.int({ min: 18, max: 65 }),
        gender: faker.helpers.arrayElement(['M', 'F', 'Other']),
        loyaltyTier,
        loyaltyPoints,
        preferredCategory: faker.helpers.arrayElement(categories),
        vip: loyaltyTier === 'platinum' || loyaltyPoints > 4000,
        warrantyOptIn: faker.datatype.boolean(),
      },
    };
  });

  await prisma.customer.createMany({ data: customerData, skipDuplicates: true });
  const customers = await prisma.customer.findMany({ select: { id: true } });
  console.log(`✅ Created ${customers.length} customers`);

  // ── Create orders SEQUENTIALLY per customer (avoids pool timeout) ──────────
  let totalOrders = 0;

  for (const customer of customers) {
    const orderCount = faker.number.int({ min: 2, max: 8 });

    for (let i = 0; i < orderCount; i++) {
      const category = faker.helpers.arrayElement(categories);
      const price = faker.number.float({ min: 299, max: 4999, fractionDigits: 2 });
      const itemCount = faker.number.int({ min: 1, max: 3 });

      await prisma.order.create({
        data: {
          customerId: customer.id,
          amount: price * itemCount,
          status: faker.helpers.weightedArrayElement([
            { weight: 85, value: 'COMPLETED' },
            { weight: 10, value: 'PENDING' },
            { weight: 5, value: 'REFUNDED' },
          ]),
          purchasedAt: faker.date.past({ years: 1 }),
          orderItems: {
            create: Array.from({ length: itemCount }, () => ({
              name: `${category} ${faker.commerce.productAdjective()}`,
              category,
              price,
            })),
          },
        },
      });
      totalOrders++;
    }

    // Progress update every 50 customers
    if (customers.indexOf(customer) % 50 === 0) {
      process.stdout.write(`\r📦 Progress: ${customers.indexOf(customer) + 1}/${customers.length} customers, ${totalOrders} orders...`);
    }
  }

  console.log(`\n✅ Created ${totalOrders} orders`);
  console.log('\n🎉 Database seeding complete!');
  console.log(`   Customers : ${customers.length}`);
  console.log(`   Orders    : ${totalOrders}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
