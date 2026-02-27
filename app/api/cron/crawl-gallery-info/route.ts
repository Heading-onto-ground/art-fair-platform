export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureExternalGalleryDirectoryTable } from "@/lib/externalGalleryDirectory";

// fixed bigint key = hashtext('crawl_gallery_info') as a safe JS integer
const LOCK_KEY = 723_641_298;

// ── auth ──────────────────────────────────────────────────────────────────────
function isCronAuthorized(req: Request) {
  const run = String(new URL(req.url).searchParams.get("run") || "");
  if (run === "1") return true;
  const authHeader = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";
  return !!expected && authHeader === `Bearer ${expected}`;
}

// ── run tracking ──────────────────────────────────────────────────────────────
let _tableReady = false;
async function ensureRunsTable() {
  if (_tableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS crawl_gallery_info_runs (
      id bigserial PRIMARY KEY,
      started_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz,
      status text NOT NULL DEFAULT 'running',
      processed int NOT NULL DEFAULT 0,
      updated int NOT NULL DEFAULT 0,
      skipped int NOT NULL DEFAULT 0,
      errors int NOT NULL DEFAULT 0,
      error_sample text,
      duration_ms int
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS crawl_gallery_info_runs_started_idx ON crawl_gallery_info_runs(started_at DESC)`
  );
  _tableReady = true;
}

async function checkAlreadyRunning(): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT 1 FROM crawl_gallery_info_runs
     WHERE status = 'running' AND started_at > NOW() - INTERVAL '30 minutes'
     LIMIT 1`
  )) as Array<unknown>;
  return rows.length > 0;
}

// ── per-gallery columns ────────────────────────────────────────────────────────
let _colsReady = false;
async function ensureGalleryColumns() {
  if (_colsReady) return;
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ExternalGalleryDirectory"
      ADD COLUMN IF NOT EXISTS last_crawled_at timestamptz,
      ADD COLUMN IF NOT EXISTS crawl_fail_count int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS crawl_last_error text,
      ADD COLUMN IF NOT EXISTS crawl_last_error_at timestamptz
  `);
  _colsReady = true;
}

async function startRun(): Promise<bigint> {
  await ensureRunsTable();
  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO crawl_gallery_info_runs DEFAULT VALUES RETURNING id`
  )) as Array<{ id: bigint }>;
  return rows[0].id;
}

async function finishRun(
  id: bigint,
  status: "success" | "error",
  counters: { processed: number; updated: number; skipped: number; errors: number },
  durationMs: number,
  errorSample: string | null
) {
  await prisma.$executeRawUnsafe(
    `UPDATE crawl_gallery_info_runs
     SET finished_at = now(), status = $2,
         processed = $3, updated = $4, skipped = $5, errors = $6,
         duration_ms = $7, error_sample = $8
     WHERE id = $1`,
    id, status,
    counters.processed, counters.updated, counters.skipped, counters.errors,
    durationMs, errorSample
  );
}

// ── extractors ────────────────────────────────────────────────────────────────
async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "ROB-GalleryInfo-Crawler/1.0 (+https://rob-roleofbridge.com)",
        accept: "text/html,*/*;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string): Promise<string> {
  const html = await fetchText(url, 9000);
  if (html) return html;
  await new Promise((r) => setTimeout(r, 500));
  return fetchText(url, 9000);
}

const _IG_SKIP = ["p", "reel", "tv", "stories", "explore", "accounts", "sharer"];
function extractInstagram(html: string): string | null {
  const pats = [
    /instagram\.com\/@?([A-Za-z0-9_.](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?)(?:[\/\s"',$)]|$)/gi,
    /href="https?:\/\/(?:www\.)?instagram\.com\/@?([A-Za-z0-9_.]{1,30})\/?"/i,
    /content="https?:\/\/(?:www\.)?instagram\.com\/@?([A-Za-z0-9_.]{1,30})\/?"/i,
    /"(?:instagram|ig_url)":\s*"https?:\/\/(?:www\.)?instagram\.com\/@?([A-Za-z0-9_.]{1,30})/i,
    /instagram\.com\/@?([A-Za-z0-9_.]{2,30})(?=[^A-Za-z0-9_.])/i,
  ];
  for (const re of pats) {
    re.lastIndex = 0;
    const m = re.exec(html);
    if (!m) continue;
    const handle = m[1].toLowerCase();
    if (_IG_SKIP.includes(handle)) continue;
    return `https://www.instagram.com/${handle}/`;
  }
  return null;
}

function extractFoundedYear(html: string): number | null {
  const clean = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
  const now = new Date().getFullYear();
  const patterns = [
    /(?:founded|established|est\.?|since)\s+(\b(?:19|20)\d{2}\b)/gi,
    /(\b(?:19|20)\d{2}\b)\s*(?:년|년도|년\s*설립|設立|創立)/g,
    /(?:opened|open\s+since|opening)\s+(?:in\s+)?(\b(?:19|20)\d{2}\b)/gi,
    /(?:gegründet|fondée?|fundada|fondata)\s+(?:im?\s+)?(\b(?:19|20)\d{2}\b)/gi,
    /(?:創設|創廊|開廊|開設)\s*(\b(?:19|20)\d{2}\b)/g,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(clean);
    if (m) {
      const y = Number(m[1]);
      if (y >= 1850 && y <= now) return y;
    }
  }
  return null;
}

function extractEmail(html: string): string | null {
  const m = html.match(/\b([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/);
  if (!m) return null;
  const email = m[1].toLowerCase();
  if (email.endsWith(".png") || email.endsWith(".jpg")) return null;
  return email;
}

function extractSpaceSize(html: string): string | null {
  const clean = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
  const pats = [
    /\d[\d,]*(?:\.\d+)?\s*(?:m²|sqm|sq\.?\s*m|square\s+meters?|㎡|평|坪)/i,
    /\d[\d,]*(?:\.\d+)?\s*(?:sq\.?\s*ft|sqft|square\s+f(?:oo|ee)t|ft²)/i,
    /\d[\d,]*(?:\.\d+)?\s*square\s+(?:metres?|meters?|feet|foot)/i,
    /(?:floor|gallery|exhibition)\s+(?:area|space)[^.]{0,40}\d[\d,]+\s*(?:m²|sqm)/i,
    /(?:총\s*면적|展示面積)[^\d]*\d[\d,]+\s*(?:㎡|m²|평)/,
  ];
  for (const re of pats) {
    const m = clean.match(re);
    if (m) return m[0].replace(/\s+/g, " ").trim().slice(0, 80);
  }
  return null;
}

async function sendWebhook(payload: object) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

// ── handler ───────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Primary concurrency guard: Postgres session-level advisory lock.
  // Acquired and released on the same connection; Prisma reuses one connection
  // per request in the Node runtime, so lock + unlock are connection-consistent.
  const lockRows = (await prisma.$queryRawUnsafe(
    `SELECT pg_try_advisory_lock($1) AS acquired`,
    LOCK_KEY
  )) as Array<{ acquired: boolean }>;

  if (!lockRows[0].acquired) {
    return NextResponse.json({ ok: true, skipped: true, reason: "locked" });
  }

  try {
  await ensureExternalGalleryDirectoryTable();
  await ensureRunsTable();

  if (await checkAlreadyRunning()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already_running" });
  }

  await ensureGalleryColumns();

  const counters = { processed: 0, updated: 0, skipped: 0, errors: 0 };
  const startedAt = Date.now();
  const runId = await startRun();

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "galleryId", "website", "instagram", "foundedYear", "spaceSize", "externalEmail",
              crawl_fail_count
       FROM "ExternalGalleryDirectory"
       WHERE "website" IS NOT NULL
         AND ("instagram" IS NULL OR "foundedYear" IS NULL)
         AND (
           crawl_fail_count IS NULL OR crawl_fail_count = 0 OR
           (crawl_fail_count < 3  AND (last_crawled_at IS NULL OR last_crawled_at < NOW() - INTERVAL '6 hours')) OR
           (crawl_fail_count >= 3 AND (last_crawled_at IS NULL OR last_crawled_at < NOW() - INTERVAL '24 hours'))
         )
       ORDER BY "qualityScore" DESC, "updatedAt" ASC
       LIMIT 60`
    )) as Array<{
      galleryId: string;
      website: string;
      instagram: string | null;
      foundedYear: number | null;
      spaceSize: string | null;
      externalEmail: string | null;
      crawl_fail_count: number;
    }>;

    counters.processed = rows.length;

    await Promise.all(Array.from({ length: 4 }, async () => {
      let row: typeof rows[0] | undefined;
      while ((row = rows.shift())) {
        try {
          const html = await fetchWithRetry(row.website);
          if (!html) {
            counters.skipped++;
            await prisma.$executeRawUnsafe(
              `UPDATE "ExternalGalleryDirectory"
               SET last_crawled_at   = NOW(),
                   crawl_fail_count  = crawl_fail_count + 1,
                   crawl_last_error  = 'fetch_empty',
                   crawl_last_error_at = NOW()
               WHERE "galleryId" = $1`,
              row.galleryId
            ).catch(() => {});
            continue;
          }

          const instagram = row.instagram ?? extractInstagram(html);
          const foundedYear = row.foundedYear ?? extractFoundedYear(html);
          const spaceSize = row.spaceSize ?? extractSpaceSize(html);
          const externalEmail = row.externalEmail ?? extractEmail(html);

          const changed =
            instagram !== row.instagram ||
            foundedYear !== row.foundedYear ||
            spaceSize !== row.spaceSize ||
            externalEmail !== row.externalEmail;

          if (!changed) {
            counters.skipped++;
            await prisma.$executeRawUnsafe(
              `UPDATE "ExternalGalleryDirectory"
               SET last_crawled_at = NOW(), crawl_fail_count = 0
               WHERE "galleryId" = $1`,
              row.galleryId
            ).catch(() => {});
            continue;
          }

          await prisma.$executeRawUnsafe(
            `UPDATE "ExternalGalleryDirectory"
             SET "instagram"       = COALESCE($2, "instagram"),
                 "foundedYear"     = COALESCE($3, "foundedYear"),
                 "spaceSize"       = COALESCE($4, "spaceSize"),
                 "externalEmail"   = COALESCE($5, "externalEmail"),
                 "updatedAt"       = NOW(),
                 last_crawled_at   = NOW(),
                 crawl_fail_count  = 0,
                 crawl_last_error  = NULL,
                 crawl_last_error_at = NULL
             WHERE "galleryId" = $1`,
            row.galleryId, instagram, foundedYear, spaceSize, externalEmail
          );
          counters.updated++;
        } catch (e: any) {
          counters.errors++;
          await prisma.$executeRawUnsafe(
            `UPDATE "ExternalGalleryDirectory"
             SET last_crawled_at     = NOW(),
                 crawl_fail_count    = crawl_fail_count + 1,
                 crawl_last_error    = $2,
                 crawl_last_error_at = NOW()
             WHERE "galleryId" = $1`,
            row.galleryId,
            String(e?.message || "unknown").slice(0, 300)
          ).catch(() => {});
        }
      }
    }));

    await finishRun(runId, "success", counters, Date.now() - startedAt, null);
    if (counters.errors > 0)
      await sendWebhook({ event: "crawl_gallery_info", status: "success_with_errors", runId: String(runId), ...counters });
    return NextResponse.json({ ok: true, runId: String(runId), ...counters });
  } catch (e: any) {
    counters.errors++;
    const sample = String(e?.message || "unknown").slice(0, 300);
    await finishRun(runId, "error", counters, Date.now() - startedAt, sample).catch(() => {});
    await sendWebhook({ event: "crawl_gallery_info", status: "error", error: sample, runId: String(runId), ...counters }).catch(() => {});
    return NextResponse.json({ ok: false, error: sample }, { status: 500 });
  }

  } finally {
    await prisma.$executeRawUnsafe(
      `SELECT pg_advisory_unlock($1)`, LOCK_KEY
    ).catch(() => {});
  }
}
