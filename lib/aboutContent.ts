import { prisma } from "@/lib/prisma";

export type AboutContent = {
  title: string;
  subtitle: string;
  story: string;
  mission: string;
  founderName: string;
  founderInstagram: string;
  founderImageUrl: string;
  updatedAt?: number;
};

const ABOUT_KEY = "about_page_v1";

const DEFAULT_ABOUT_CONTENT: AboutContent = {
  title: "About ROB",
  subtitle: "Role of Bridge - Connecting artists and galleries worldwide.",
  story:
    "ROB started with one question: how can artists and galleries connect across borders with less friction? We are building a global bridge for open calls, applications, and exhibitions.",
  mission:
    "Our mission is to make global exhibition opportunities open, transparent, and easy to access for every artist and gallery.",
  founderName: "Founder",
  founderInstagram: "@noas_no_art_special",
  founderImageUrl: "",
};

function toSafeString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeAboutContent(input: unknown): AboutContent {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    title: toSafeString(raw.title) || DEFAULT_ABOUT_CONTENT.title,
    subtitle: toSafeString(raw.subtitle) || DEFAULT_ABOUT_CONTENT.subtitle,
    story: toSafeString(raw.story) || DEFAULT_ABOUT_CONTENT.story,
    mission: toSafeString(raw.mission) || DEFAULT_ABOUT_CONTENT.mission,
    founderName: toSafeString(raw.founderName) || DEFAULT_ABOUT_CONTENT.founderName,
    founderInstagram: toSafeString(raw.founderInstagram) || DEFAULT_ABOUT_CONTENT.founderInstagram,
    founderImageUrl: toSafeString(raw.founderImageUrl),
  };
}

async function ensureSiteContentTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SiteContent" (
      "key" TEXT PRIMARY KEY,
      "value" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAboutContent(): Promise<AboutContent> {
  await ensureSiteContentTable();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "value", "updatedAt" FROM "SiteContent" WHERE "key" = $1 LIMIT 1`,
    ABOUT_KEY
  )) as Array<{ value: unknown; updatedAt: Date | string | null }>;

  const row = rows[0];
  if (!row) return { ...DEFAULT_ABOUT_CONTENT };

  const normalized = normalizeAboutContent(row.value);
  const updatedAt = row.updatedAt ? new Date(row.updatedAt).getTime() : undefined;
  return { ...normalized, updatedAt };
}

export async function saveAboutContent(input: unknown): Promise<AboutContent> {
  await ensureSiteContentTable();
  const normalized = normalizeAboutContent(input);
  const payload = JSON.stringify(normalized);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "SiteContent" ("key", "value", "updatedAt")
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT ("key")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "updatedAt" = NOW()
    `,
    ABOUT_KEY,
    payload
  );

  return getAboutContent();
}

