import { prisma } from "@/lib/prisma";
import { listOpenCalls } from "@/app/data/openCalls";
import { listExternalGalleryDirectory } from "@/lib/externalGalleryDirectory";

export type GalleryEmailDirectoryItem = {
  id: string;
  email: string;
  galleryName: string;
  country: string | null;
  city: string | null;
  language: string;
  source: string;
  galleryId: string | null;
  website: string | null;
  qualityScore: number;
  isActive: boolean;
  isBlocked: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type Candidate = {
  email: string;
  galleryName: string;
  country?: string;
  city?: string;
  language?: string;
  source: string;
  galleryId?: string;
  website?: string;
  qualityScore?: number;
};

let ensured = false;
const EMAIL_NOT_AVAILABLE_LABEL = "이메일 확인 불가";

function normalizeEmail(input: string) {
  return String(input || "").trim().toLowerCase();
}

function normalizeLanguage(input?: string) {
  const v = String(input || "").trim().toLowerCase();
  if (["ko", "ja", "fr", "de", "it", "zh", "en"].includes(v)) return v;
  return "en";
}

function inferLanguageFromCountry(country?: string) {
  const c = String(country || "").trim().toLowerCase();
  if (!c) return "en";
  if (c.includes("한국") || c.includes("korea")) return "ko";
  if (c.includes("일본") || c.includes("japan")) return "ja";
  if (c.includes("프랑스") || c.includes("france")) return "fr";
  if (c.includes("독일") || c.includes("germany")) return "de";
  if (c.includes("이탈리아") || c.includes("italy")) return "it";
  if (c.includes("중국") || c.includes("china")) return "zh";
  return "en";
}

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function isPlaceholderEmail(input: string) {
  const email = normalizeEmail(input);
  if (!email) return false;
  if (email.endsWith("@gallery.art")) return true;
  if (email.endsWith("@rob.art")) return true;
  if (email.endsWith("@rob-roleofbridge.com")) return true;
  if (email.endsWith("@invalid.local")) return true;
  return false;
}

function isCollectibleGalleryEmail(input: string) {
  const email = normalizeEmail(input);
  if (!email || !isValidEmail(email)) return false;
  if (isPlaceholderEmail(email)) return false;
  if (email === normalizeEmail(EMAIL_NOT_AVAILABLE_LABEL)) return false;
  return true;
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function extractEmails(text: string) {
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const found = String(text || "").match(emailRegex) || [];
  return unique(found.map((v) => normalizeEmail(v))).filter(isCollectibleGalleryEmail);
}

function pickBestEmail(candidates: string[], websiteHost: string) {
  if (!candidates.length) return "";
  const host = String(websiteHost || "").trim().toLowerCase();
  const clean = candidates
    .map((c) => normalizeEmail(c))
    .filter((c) => isCollectibleGalleryEmail(c))
    .filter((c) => !c.startsWith("noreply@") && !c.startsWith("no-reply@"));
  if (!clean.length) return "";
  if (host) {
    const sameHost = clean.find((c) => c.endsWith(`@${host}`));
    if (sameHost) return sameHost;
  }
  return clean[0];
}

async function fetchText(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "ROB-GalleryEmail-Collector/1.0" },
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) return "";
    const html = await res.text();
    return String(html || "");
  } catch {
    return "";
  }
}

async function discoverPublicGalleryEmail(
  website: string,
  cache: Map<string, string>
): Promise<string> {
  const host = hostFromUrl(website);
  if (!host) return "";
  if (cache.has(host)) return String(cache.get(host) || "");

  const origin = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const base = origin.replace(/\/+$/, "");
  const targets = unique([
    base,
    `${base}/contact`,
    `${base}/about`,
  ]);

  const emails: string[] = [];
  for (const url of targets) {
    const text = await fetchText(url);
    if (!text) continue;
    const found = extractEmails(text);
    if (found.length) {
      emails.push(...found);
      const picked = pickBestEmail(emails, host);
      if (picked) {
        cache.set(host, picked);
        return picked;
      }
    }
  }

  cache.set(host, "");
  return "";
}

function sourcePriority(source: string) {
  if (source === "internal_gallery") return 3;
  if (source === "external_directory") return 2;
  if (source === "open_call") return 1;
  return 0;
}

function mergeCandidate(prev: Candidate | undefined, next: Candidate): Candidate {
  if (!prev) return next;
  const useNext = sourcePriority(next.source) >= sourcePriority(prev.source);
  return {
    email: prev.email,
    galleryName: useNext ? next.galleryName || prev.galleryName : prev.galleryName || next.galleryName,
    country: prev.country || next.country,
    city: prev.city || next.city,
    language: prev.language || next.language,
    source: useNext ? next.source : prev.source,
    galleryId: prev.galleryId || next.galleryId,
    website: prev.website || next.website,
    qualityScore: Math.max(prev.qualityScore || 0, next.qualityScore || 0),
  };
}

export async function ensureGalleryEmailDirectoryTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GalleryEmailDirectory" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email" TEXT NOT NULL,
      "galleryName" TEXT NOT NULL,
      "country" TEXT,
      "city" TEXT,
      "language" TEXT NOT NULL DEFAULT 'en',
      "source" TEXT NOT NULL DEFAULT 'unknown',
      "galleryId" TEXT,
      "website" TEXT,
      "qualityScore" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "isBlocked" BOOLEAN NOT NULL DEFAULT false,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "GalleryEmailDirectory_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "GalleryEmailDirectory_email_key" ON "GalleryEmailDirectory" ("email");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "GalleryEmailDirectory_country_idx" ON "GalleryEmailDirectory" ("country");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "GalleryEmailDirectory_active_idx" ON "GalleryEmailDirectory" ("isActive", "isBlocked");`
  );
  ensured = true;
}

export async function upsertGalleryEmailDirectory(candidates: Candidate[]) {
  await ensureGalleryEmailDirectoryTable();
  let upserted = 0;
  for (const row of candidates) {
    const email = normalizeEmail(row.email);
    if (!email || !isValidEmail(email)) continue;
    const galleryName = String(row.galleryName || "").trim();
    if (!galleryName) continue;
    const country = String(row.country || "").trim() || null;
    const city = String(row.city || "").trim() || null;
    const language = normalizeLanguage(row.language || inferLanguageFromCountry(country || undefined));
    const source = String(row.source || "unknown").trim() || "unknown";
    const galleryId = String(row.galleryId || "").trim() || null;
    const website = String(row.website || "").trim() || null;
    const qualityScore = Number.isFinite(row.qualityScore) ? Number(row.qualityScore) : 0;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "GalleryEmailDirectory"
        ("email", "galleryName", "country", "city", "language", "source", "galleryId", "website", "qualityScore", "lastSeenAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT ("email")
      DO UPDATE SET
        "galleryName" = EXCLUDED."galleryName",
        "country" = COALESCE(EXCLUDED."country", "GalleryEmailDirectory"."country"),
        "city" = COALESCE(EXCLUDED."city", "GalleryEmailDirectory"."city"),
        "language" = COALESCE(EXCLUDED."language", "GalleryEmailDirectory"."language"),
        "source" = EXCLUDED."source",
        "galleryId" = COALESCE(EXCLUDED."galleryId", "GalleryEmailDirectory"."galleryId"),
        "website" = COALESCE(EXCLUDED."website", "GalleryEmailDirectory"."website"),
        "qualityScore" = GREATEST("GalleryEmailDirectory"."qualityScore", EXCLUDED."qualityScore"),
        "isActive" = true,
        "lastSeenAt" = NOW(),
        "updatedAt" = NOW();
      `,
      email,
      galleryName,
      country,
      city,
      language,
      source,
      galleryId,
      website,
      qualityScore
    );
    upserted += 1;
  }
  return { upserted };
}

export async function syncGalleryEmailDirectory() {
  await ensureGalleryEmailDirectoryTable();
  await deletePlaceholderGalleryEmails();

  const [openCalls, externalDirectory, internalGalleries] = await Promise.all([
    listOpenCalls(),
    listExternalGalleryDirectory(),
    prisma.user.findMany({
      where: { role: "gallery" },
      select: {
        email: true,
        galleryProfile: {
          select: { name: true, country: true, city: true, galleryId: true, website: true },
        },
      },
    }),
  ]);

  const byEmail = new Map<string, Candidate>();
  const byHostName = new Map<string, Omit<Candidate, "email">>();
  const discoveryCache = new Map<string, string>();
  let discoveryAttempts = 0;
  const discoveryLimit = 12;

  for (const g of internalGalleries) {
    const email = normalizeEmail(g.email);
    if (!email || !isCollectibleGalleryEmail(email)) continue;
    const candidate: Candidate = {
      email,
      galleryName: g.galleryProfile?.name || email,
      country: g.galleryProfile?.country || undefined,
      city: g.galleryProfile?.city || undefined,
      language: inferLanguageFromCountry(g.galleryProfile?.country || undefined),
      source: "internal_gallery",
      galleryId: g.galleryProfile?.galleryId || undefined,
      website: g.galleryProfile?.website || undefined,
      qualityScore: 100,
    };
    byEmail.set(email, mergeCandidate(byEmail.get(email), candidate));
  }

  for (const e of externalDirectory) {
    const email = normalizeEmail(e.externalEmail || "");
    const base: Omit<Candidate, "email"> = {
      galleryName: e.name,
      country: e.country || undefined,
      city: e.city || undefined,
      language: inferLanguageFromCountry(e.country || undefined),
      source: "external_directory",
      galleryId: e.galleryId || undefined,
      website: e.website || undefined,
      qualityScore: Number(e.qualityScore || 60),
    };
    if (email && isCollectibleGalleryEmail(email)) {
      byEmail.set(email, mergeCandidate(byEmail.get(email), { ...base, email }));
      continue;
    }
    const host = hostFromUrl(e.website || "");
    const key = `${host}|${normalizeEmail(e.name)}`;
    if (host && !byHostName.has(key)) byHostName.set(key, base);
  }

  for (const oc of openCalls) {
    if (!oc.isExternal) continue;
    const email = normalizeEmail(oc.externalEmail || "");
    const base: Omit<Candidate, "email"> = {
      galleryName: oc.gallery,
      country: oc.country || undefined,
      city: oc.city || undefined,
      language: inferLanguageFromCountry(oc.country || undefined),
      source: "open_call",
      galleryId: oc.galleryId || undefined,
      website: oc.galleryWebsite || undefined,
      qualityScore: 50,
    };
    if (email && isCollectibleGalleryEmail(email)) {
      byEmail.set(email, mergeCandidate(byEmail.get(email), { ...base, email }));
      continue;
    }
    const host = hostFromUrl(oc.galleryWebsite || "");
    const key = `${host}|${normalizeEmail(oc.gallery)}`;
    if (host && !byHostName.has(key)) byHostName.set(key, base);
  }

  for (const base of byHostName.values()) {
    if (discoveryAttempts >= discoveryLimit) break;
    const website = String(base.website || "").trim();
    if (!website) continue;
    discoveryAttempts += 1;
    const discovered = await discoverPublicGalleryEmail(website, discoveryCache);
    if (!discovered || !isCollectibleGalleryEmail(discovered)) continue;
    byEmail.set(
      discovered,
      mergeCandidate(byEmail.get(discovered), {
        ...base,
        email: discovered,
        source: "website_discovery",
        qualityScore: Math.max(Number(base.qualityScore || 0), 70),
      })
    );
  }

  const candidates = Array.from(byEmail.values());
  const result = await upsertGalleryEmailDirectory(candidates);
  return {
    collected: candidates.length,
    upserted: result.upserted,
    discovered: discoveryAttempts,
  };
}

export async function deletePlaceholderGalleryEmails() {
  await ensureGalleryEmailDirectoryTable();
  const deleted = await prisma.$executeRawUnsafe(
    `
      DELETE FROM "GalleryEmailDirectory"
      WHERE lower("email") LIKE '%@gallery.art'
         OR lower("email") LIKE '%@rob.art'
         OR lower("email") LIKE '%@rob-roleofbridge.com';
    `
  );
  const cleanedOpenCall = await prisma.$executeRawUnsafe(
    `
      UPDATE "OpenCall"
      SET "externalEmail" = NULL
      WHERE "externalEmail" IS NOT NULL
        AND (
          lower("externalEmail") LIKE '%@gallery.art'
          OR lower("externalEmail") LIKE '%@rob.art'
          OR lower("externalEmail") LIKE '%@rob-roleofbridge.com'
        );
    `
  );
  let cleanedExternalDirectory = 0;
  try {
    cleanedExternalDirectory = await prisma.$executeRawUnsafe(
      `
        UPDATE "ExternalGalleryDirectory"
        SET "externalEmail" = NULL
        WHERE "externalEmail" IS NOT NULL
          AND (
            lower("externalEmail") LIKE '%@gallery.art'
            OR lower("externalEmail") LIKE '%@rob.art'
            OR lower("externalEmail") LIKE '%@rob-roleofbridge.com'
          );
      `
    );
  } catch {
    cleanedExternalDirectory = 0;
  }
  const anonymizedUsers = await prisma.$executeRawUnsafe(
    `
      UPDATE "User"
      SET "email" = 'email-unverified+' || "id" || '@invalid.local'
      WHERE "role" = 'gallery'
        AND (
          lower("email") LIKE '%@gallery.art'
          OR lower("email") LIKE '%@rob.art'
          OR lower("email") LIKE '%@rob-roleofbridge.com'
        );
    `
  );
  return { deleted, cleanedOpenCall, cleanedExternalDirectory, anonymizedUsers };
}

export async function listGalleryEmailDirectory(params?: {
  country?: string;
  activeOnly?: boolean;
  limit?: number;
}) {
  await ensureGalleryEmailDirectoryTable();
  const conditions: string[] = [];
  const values: any[] = [];

  if (params?.country) {
    values.push(params.country);
    conditions.push(`"country" = $${values.length}`);
  }
  if (params?.activeOnly !== false) {
    conditions.push(`"isActive" = true AND "isBlocked" = false`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  let limitSql = "";
  if (params?.limit && params.limit > 0) {
    values.push(params.limit);
    limitSql = `LIMIT $${values.length}`;
  }

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "email",
        "galleryName",
        "country",
        "city",
        "language",
        "source",
        "galleryId",
        "website",
        "qualityScore",
        "isActive",
        "isBlocked",
        "lastSeenAt",
        "createdAt",
        "updatedAt"
      FROM "GalleryEmailDirectory"
      ${where}
      ORDER BY "qualityScore" DESC, "updatedAt" DESC, "email" ASC
      ${limitSql};
    `,
    ...values
  )) as GalleryEmailDirectoryItem[];
  return rows;
}

export async function getGalleryEmailDirectoryStats() {
  await ensureGalleryEmailDirectoryTable();
  const [total, active, blocked] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "GalleryEmailDirectory";`) as Promise<Array<{ n: number }>>,
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "GalleryEmailDirectory" WHERE "isActive" = true AND "isBlocked" = false;`
    ) as Promise<Array<{ n: number }>>,
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "GalleryEmailDirectory" WHERE "isBlocked" = true;`) as Promise<
      Array<{ n: number }>
    >,
  ]);

  const countries = (await prisma.$queryRawUnsafe(
    `
      SELECT COALESCE("country", '') AS "country", COUNT(*)::int AS "count"
      FROM "GalleryEmailDirectory"
      WHERE "isActive" = true AND "isBlocked" = false
      GROUP BY "country"
      ORDER BY "count" DESC, "country" ASC;
    `
  )) as Array<{ country: string; count: number }>;

  return {
    total: total[0]?.n || 0,
    active: active[0]?.n || 0,
    blocked: blocked[0]?.n || 0,
    countries,
  };
}

