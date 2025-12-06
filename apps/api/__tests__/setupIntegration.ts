import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
(async function setup() {
  try {
    console.log('Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/../..', stdio: 'inherit' });
  } catch (err) {
    console.warn('Prisma migrate may have failed:', err.message);
  }
  // clear data to ensure test idempotency
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ManualAmazonOrder" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "AmazonOrder" CASCADE');
  } catch (e) {
    // ignore
  }
  await prisma.$disconnect();
})();
