import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type RejectedArtistStatus = "pending" | "published" | "rejected";

type DbRow = {
  id: string;
  userId: string;
  artistId: string | null;
  artistName: string | null;
  anonymousAlias: string;
  title: string;
  content: string;
  workLinks: string | null;
  rejectionContext: string | null;
  emotion: string | null;
  status: RejectedArtistStatus;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  userEmail?: string | null;
};

export type PublicRejectedArtistItem = {
  id: string;
  anonymousAlias: string;
  title: string;
  content: string;
  workLinks: string | null;
  rejectionContext: string | null;
  emotion: string | null;
  createdAt: number;
  publishedAt: number | null;
};

export type MyRejectedArtistItem = {
  id: string;
  anonymousAlias: string;
  title: string;
  content: string;
  workLinks: string | null;
  rejectionContext: string | null;
  emotion: string | null;
  status: RejectedArtistStatus;
  adminNote: string | null;
  createdAt: number;
  publishedAt: number | null;
};

export type AdminRejectedArtistItem = {
  id: string;
  userId: string;
  userEmail: string | null;
  artistId: string | null;
  artistName: string | null;
  anonymousAlias: string;
  title: string;
  content: string;
  workLinks: string | null;
  rejectionContext: string | null;
  emotion: string | null;
  status: RejectedArtistStatus;
  adminNote: string | null;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

function mapPublic(row: DbRow): PublicRejectedArtistItem {
  return {
    id: row.id,
    anonymousAlias: row.anonymousAlias,
    title: row.title,
    content: row.content,
    workLinks: row.workLinks ?? null,
    rejectionContext: row.rejectionContext ?? null,
    emotion: row.emotion ?? null,
    createdAt: row.createdAt.getTime(),
    publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
  };
}

function mapMine(row: DbRow): MyRejectedArtistItem {
  return {
    id: row.id,
    anonymousAlias: row.anonymousAlias,
    title: row.title,
    content: row.content,
    workLinks: row.workLinks ?? null,
    rejectionContext: row.rejectionContext ?? null,
    emotion: row.emotion ?? null,
    status: row.status,
    adminNote: row.adminNote ?? null,
    createdAt: row.createdAt.getTime(),
    publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
  };
}

function mapAdmin(row: DbRow): AdminRejectedArtistItem {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail ?? null,
    artistId: row.artistId ?? null,
    artistName: row.artistName ?? null,
    anonymousAlias: row.anonymousAlias,
    title: row.title,
    content: row.content,
    workLinks: row.workLinks ?? null,
    rejectionContext: row.rejectionContext ?? null,
    emotion: row.emotion ?? null,
    status: row.status,
    adminNote: row.adminNote ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
  };
}

export function makeAnonymousAlias(userId: string): string {
  const secret = String(process.env.REJECTED_ARTISTS_ALIAS_SALT || process.env.SESSION_SECRET || "rob-anon-seed");
  const hash = crypto.createHash("sha256").update(`${secret}:${userId}`).digest("hex").toUpperCase().slice(0, 6);
  return `Anonymous Artist #${hash}`;
}

export async function ensureRejectedArtistsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ArtistRejectionTestimony" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "artistId" TEXT,
      "artistName" TEXT,
      "anonymousAlias" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "workLinks" TEXT,
      "rejectionContext" TEXT,
      "emotion" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "adminNote" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "publishedAt" TIMESTAMP(3)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_artist_rejection_status_createdAt"
    ON "ArtistRejectionTestimony" ("status", "createdAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_artist_rejection_userId_createdAt"
    ON "ArtistRejectionTestimony" ("userId", "createdAt" DESC)
  `);
}

export async function createRejectedArtistTestimony(input: {
  userId: string;
  artistId?: string | null;
  artistName?: string | null;
  title: string;
  content: string;
  workLinks?: string | null;
  rejectionContext?: string | null;
  emotion?: string | null;
}): Promise<MyRejectedArtistItem> {
  await ensureRejectedArtistsTable();
  const alias = makeAnonymousAlias(input.userId);
  const id = crypto.randomUUID();
  const rows = (await prisma.$queryRawUnsafe(
    `
      INSERT INTO "ArtistRejectionTestimony"
      ("id", "userId", "artistId", "artistName", "anonymousAlias", "title", "content", "workLinks", "rejectionContext", "emotion", "status", "createdAt", "updatedAt")
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW(), NOW())
      RETURNING *
    `,
    id,
    input.userId,
    input.artistId ?? null,
    input.artistName ?? null,
    alias,
    input.title,
    input.content,
    input.workLinks ?? null,
    input.rejectionContext ?? null,
    input.emotion ?? null
  )) as DbRow[];
  return mapMine(rows[0]);
}

export async function listPublishedRejectedArtistTestimonies(limit = 30): Promise<PublicRejectedArtistItem[]> {
  await ensureRejectedArtistsTable();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT *
      FROM "ArtistRejectionTestimony"
      WHERE "status" = 'published'
      ORDER BY COALESCE("publishedAt", "createdAt") DESC
      LIMIT $1
    `,
    limit
  )) as DbRow[];
  return rows.map(mapPublic);
}

export async function listMyRejectedArtistTestimonies(userId: string, limit = 50): Promise<MyRejectedArtistItem[]> {
  await ensureRejectedArtistsTable();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT *
      FROM "ArtistRejectionTestimony"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT $2
    `,
    userId,
    limit
  )) as DbRow[];
  return rows.map(mapMine);
}

export async function listAdminRejectedArtistTestimonies(input?: {
  status?: RejectedArtistStatus;
  limit?: number;
}): Promise<AdminRejectedArtistItem[]> {
  await ensureRejectedArtistsTable();
  const status = input?.status ? String(input.status) : "";
  const limit = Math.max(1, Math.min(200, Number(input?.limit || 100)));
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT t.*, u.email AS "userEmail"
      FROM "ArtistRejectionTestimony" t
      LEFT JOIN "User" u ON u.id = t."userId"
      WHERE ($1 = '' OR t."status" = $1)
      ORDER BY
        CASE WHEN t."status" = 'pending' THEN 0 ELSE 1 END,
        t."createdAt" DESC
      LIMIT $2
    `,
    status,
    limit
  )) as DbRow[];
  return rows.map(mapAdmin);
}

export async function reviewRejectedArtistTestimony(input: {
  id: string;
  action: "publish" | "reject";
  adminNote?: string | null;
}): Promise<AdminRejectedArtistItem | null> {
  await ensureRejectedArtistsTable();
  const nextStatus: RejectedArtistStatus = input.action === "publish" ? "published" : "rejected";
  const rows = (await prisma.$queryRawUnsafe(
    `
      UPDATE "ArtistRejectionTestimony"
      SET
        "status" = $2,
        "adminNote" = $3,
        "publishedAt" = CASE WHEN $2 = 'published' THEN COALESCE("publishedAt", NOW()) ELSE NULL END,
        "updatedAt" = NOW()
      WHERE "id" = $1
      RETURNING *
    `,
    input.id,
    nextStatus,
    input.adminNote ?? null
  )) as DbRow[];
  if (!rows[0]) return null;
  const row = rows[0];
  const joined = (await prisma.$queryRawUnsafe(
    `
      SELECT t.*, u.email AS "userEmail"
      FROM "ArtistRejectionTestimony" t
      LEFT JOIN "User" u ON u.id = t."userId"
      WHERE t."id" = $1
      LIMIT 1
    `,
    row.id
  )) as DbRow[];
  return joined[0] ? mapAdmin(joined[0]) : mapAdmin(row);
}
