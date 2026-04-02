import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Status = "prepared" | "copied" | "opened" | "sent";

function normalizeInstagram(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const maybeHandle = raw.replace(/^@/, "").trim();
  if (/^[a-z0-9._]{2,30}$/i.test(maybeHandle)) {
    return `https://www.instagram.com/${maybeHandle.toLowerCase()}/`;
  }

  const m = raw.match(/instagram\.com\/@?([a-z0-9._]{2,30})/i);
  if (m?.[1]) {
    return `https://www.instagram.com/${m[1].toLowerCase()}/`;
  }

  return raw;
}

function isAllowedStatus(input: string): input is Status {
  return input === "prepared" || input === "copied" || input === "opened" || input === "sent";
}

let tableEnsured = false;
async function ensureInstagramOutreachTable() {
  if (tableEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InstagramOutreachRecord" (
      "id" BIGSERIAL PRIMARY KEY,
      "instagram" TEXT NOT NULL,
      "galleryName" TEXT NOT NULL,
      "country" TEXT,
      "city" TEXT,
      "status" TEXT NOT NULL DEFAULT 'prepared',
      "message" TEXT,
      "sentAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "InstagramOutreachRecord_instagram_idx" ON "InstagramOutreachRecord" ("instagram");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "InstagramOutreachRecord_createdAt_idx" ON "InstagramOutreachRecord" ("createdAt" DESC);`
  );
  tableEnsured = true;
}

export async function GET(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    await ensureInstagramOutreachTable();

    const url = new URL(req.url);
    const country = String(url.searchParams.get("country") || "").trim();
    const q = String(url.searchParams.get("q") || "").trim();
    const limitRaw = Number(url.searchParams.get("limit") || "300");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, limitRaw)) : 300;

    const values: any[] = [];
    const clauses: string[] = [`"instagram" IS NOT NULL`, `trim("instagram") <> ''`];
    if (country && country !== "ALL") {
      values.push(country);
      clauses.push(`"country" = $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      const idx = values.length;
      clauses.push(`("name" ILIKE $${idx} OR COALESCE("city", '') ILIKE $${idx} OR COALESCE("country", '') ILIKE $${idx})`);
    }
    values.push(limit);
    const limitIdx = values.length;

    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        "galleryId",
        "name",
        "country",
        "city",
        "website",
        "sourcePortal",
        "qualityScore",
        "instagram"
      FROM "ExternalGalleryDirectory"
      WHERE ${clauses.join(" AND ")}
      ORDER BY "qualityScore" DESC, "updatedAt" DESC, "name" ASC
      LIMIT $${limitIdx};
      `,
      ...values
    )) as Array<{
      galleryId: string;
      name: string;
      country: string;
      city: string;
      website: string | null;
      sourcePortal: string | null;
      qualityScore: number;
      instagram: string | null;
    }>;

    const normalizedRows = rows
      .map((r) => ({
        ...r,
        instagram: normalizeInstagram(r.instagram || ""),
      }))
      .filter((r) => !!r.instagram);

    const uniqueInstagrams = Array.from(new Set(normalizedRows.map((r) => r.instagram)));
    const records = uniqueInstagrams.length
      ? (await prisma.$queryRawUnsafe(
        `
        SELECT "instagram", "status", "sentAt", "createdAt"
        FROM "InstagramOutreachRecord"
        WHERE "instagram" = ANY($1::text[])
        ORDER BY "createdAt" DESC;
        `,
        uniqueInstagrams
      )) as Array<{ instagram: string; status: string; sentAt: Date | null; createdAt: Date }>
      : [];

    const latestByInstagram = new Map<string, { status: string; sentAt: Date | null }>();
    for (const rec of records) {
      const key = normalizeInstagram(rec.instagram || "");
      if (!key || latestByInstagram.has(key)) continue;
      latestByInstagram.set(key, { status: rec.status, sentAt: rec.sentAt || null });
    }

    const merged = normalizedRows.map((r) => {
      const latest = latestByInstagram.get(r.instagram || "");
      return {
        ...r,
        lastStatus: latest?.status || null,
        lastSentAt: latest?.sentAt || null,
      };
    });

    const sentCount = merged.filter((r) => r.lastStatus === "sent").length;
    return NextResponse.json({
      ok: true,
      rows: merged,
      stats: {
        total: merged.length,
        sent: sentCount,
        unsent: merged.length - sentCount,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/instagram-outreach failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    await ensureInstagramOutreachTable();

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    if (action !== "mark") return NextResponse.json({ ok: false, error: "invalid action" }, { status: 400 });

    const instagram = normalizeInstagram(String(body?.instagram || ""));
    const galleryName = String(body?.galleryName || "").trim();
    const country = String(body?.country || "").trim() || null;
    const city = String(body?.city || "").trim() || null;
    const statusRaw = String(body?.status || "").trim().toLowerCase();
    const message = String(body?.message || "").trim() || null;
    const status: Status = isAllowedStatus(statusRaw) ? statusRaw : "prepared";
    if (!instagram || !galleryName) {
      return NextResponse.json({ ok: false, error: "instagram and galleryName are required" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "InstagramOutreachRecord"
      ("instagram", "galleryName", "country", "city", "status", "message", "sentAt")
      VALUES
      ($1, $2, $3, $4, $5, $6, $7);
      `,
      instagram,
      galleryName,
      country,
      city,
      status,
      message,
      status === "sent" ? new Date() : null
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/instagram-outreach failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
