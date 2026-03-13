import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const vals = ['residency', 'award', 'grant', 'opencall_result', 'press'];
for (const v of vals) {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "ArtEventType" ADD VALUE IF NOT EXISTS '${v}'`);
    console.log('added:', v);
  } catch (e) {
    console.log('skip:', v, e.message);
  }
}
await prisma.$disconnect();
await pool.end();
