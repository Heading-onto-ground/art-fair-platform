export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureExternalGalleryDirectoryTable } from "@/lib/externalGalleryDirectory";

function isCronAuthorized(req: Request) {
  const run = String(new URL(req.url).searchParams.get("run") || "");
  if (run === "1") return true;
  const authHeader = req.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET || "";
  return !!expected && authHeader === `Bearer ${expected}`;
}

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

function extractInstagram(html: string): string | null {
  const m =
    html.match(/instagram\.com\/([A-Za-z0-9_.](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?)(?:\/|"|'|\s)/i);
  if (!m) return null;
  const handle = m[1].toLowerCase();
  if (["p", "reel", "tv", "stories", "explore", "accounts"].includes(handle)) return null;
  return `https://www.instagram.com/${handle}/`;
}

function extractFoundedYear(html: string): number | null {
  const clean = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
  const patterns = [
    /(?:founded|established|founded\s+in|est\.?|since)\s+(\b(?:19|20)\d{2}\b)/gi,
    /(\b(?:19|20)\d{2}\b)\s*(?:년|년도|년\s*설립|설立|年設立|年創立)/g,
    /設立\s*[:：]?\s*(\b(?:19|20)\d{2}\b)/gi,
    /創立\s*[:：]?\s*(\b(?:19|20)\d{2}\b)/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(clean);
    if (m) {
      const y = Number(m[1]);
      if (y >= 1850 && y <= new Date().getFullYear()) return y;
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
  const m =
    clean.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:m²|sqm|sq\.?\s*m|square\s+meters?|㎡|평|坪)/i);
  if (!m) return null;
  return m[0].replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await ensureExternalGalleryDirectoryTable();

  // Only process galleries missing at least one field (to stay idempotent & cheap)
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "galleryId", "website", "instagram", "foundedYear", "spaceSize", "externalEmail"
     FROM "ExternalGalleryDirectory"
     WHERE "website" IS NOT NULL
       AND ("instagram" IS NULL OR "foundedYear" IS NULL)
     ORDER BY "qualityScore" DESC, "updatedAt" ASC
     LIMIT 60`
  )) as Array<{
    galleryId: string;
    website: string;
    instagram: string | null;
    foundedYear: number | null;
    spaceSize: string | null;
    externalEmail: string | null;
  }>;

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const html = await fetchText(row.website, 9000);
    if (!html) { skipped++; continue; }

    const instagram = row.instagram ?? extractInstagram(html);
    const foundedYear = row.foundedYear ?? extractFoundedYear(html);
    const spaceSize = row.spaceSize ?? extractSpaceSize(html);
    const externalEmail = row.externalEmail ?? extractEmail(html);

    const changed =
      instagram !== row.instagram ||
      foundedYear !== row.foundedYear ||
      spaceSize !== row.spaceSize ||
      externalEmail !== row.externalEmail;

    if (!changed) { skipped++; continue; }

    await prisma.$executeRawUnsafe(
      `UPDATE "ExternalGalleryDirectory"
       SET "instagram"    = COALESCE($2, "instagram"),
           "foundedYear"  = COALESCE($3, "foundedYear"),
           "spaceSize"    = COALESCE($4, "spaceSize"),
           "externalEmail"= COALESCE($5, "externalEmail"),
           "updatedAt"    = NOW()
       WHERE "galleryId" = $1`,
      row.galleryId,
      instagram,
      foundedYear,
      spaceSize,
      externalEmail
    );
    updated++;
  }

  return NextResponse.json({ ok: true, processed: rows.length, updated, skipped });
}
