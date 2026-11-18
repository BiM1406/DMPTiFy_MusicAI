import { PrismaClient } from '@prisma/client';
import { seedPrismaDatabase } from '../src/database/prisma-seed.helper.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedPrismaDatabase(prisma);
  console.log('Seeded DMPTiFy MySQL 3NF database successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
