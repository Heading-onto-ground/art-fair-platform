import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sqls = [
  `CREATE TABLE IF NOT EXISTS "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Follow_followerId_followingId_key" UNIQUE ("followerId","followingId")
  )`,
  `CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow"("followerId")`,
  `CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow"("followingId")`,
  `CREATE TABLE IF NOT EXISTS "CuratorList" (
    "id" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CuratorList_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CuratorList_curatorId_idx" ON "CuratorList"("curatorId")`,
  `CREATE TABLE IF NOT EXISTS "CuratorListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CuratorListItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CuratorListItem_listId_artistId_key" UNIQUE ("listId","artistId"),
    CONSTRAINT "CuratorListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "CuratorList"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "CuratorListItem_listId_idx" ON "CuratorListItem"("listId")`,
];

for (const sql of sqls) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('ok:', sql.slice(0, 50));
  } catch (e) {
    console.log('err:', e.message.slice(0, 80));
  }
}
await prisma.$disconnect();
await pool.end();
