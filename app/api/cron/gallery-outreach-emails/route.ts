export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cronAuth";
import { sendBatchOutreach } from "@/lib/outreach";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CandidateRow = {
  email: string;
  galleryName: string;
  country: string | null;
  language: string | null;
  qualityScore: number | null;
};

function normalizeLanguage(input: string | null | undefined): "en" | "ko" | "ja" | "fr" | "de" | "it" | "zh" {
  const v = String(input || "").trim().toLowerCase();
  if (v === "ko" || v === "ja" || v === "fr" || v === "de" || v === "it" || v === "zh") return v;
  return "en";
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dailyLimitRaw = Number(process.env.OUTREACH_DAILY_LIMIT || "40");
  const cooldownDaysRaw = Number(process.env.OUTREACH_COOLDOWN_DAYS || "21");
  const minQualityRaw = Number(process.env.OUTREACH_MIN_QUALITY || "60");

  const dailyLimit = Number.isFinite(dailyLimitRaw) ? Math.max(1, Math.min(200, dailyLimitRaw)) : 40;
  const cooldownDays = Number.isFinite(cooldownDaysRaw) ? Math.max(7, Math.min(90, cooldownDaysRaw)) : 21;
  const minQuality = Number.isFinite(minQualityRaw) ? Math.max(0, Math.min(100, minQualityRaw)) : 60;

  const since = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        d."email",
        d."galleryName",
        d."country",
        d."language",
        d."qualityScore"
      FROM "GalleryEmailDirectory" d
      LEFT JOIN LATERAL (
        SELECT o."sentAt"
        FROM "OutreachRecord" o
        WHERE lower(o."toEmail") = lower(d."email")
        ORDER BY o."sentAt" DESC
        LIMIT 1
      ) last_outreach ON true
      WHERE d."isActive" = true
        AND d."isBlocked" = false
        AND coalesce(d."qualityScore", 0) >= $1
        AND (last_outreach."sentAt" IS NULL OR last_outreach."sentAt" < $2)
      ORDER BY coalesce(d."qualityScore", 0) DESC, d."updatedAt" DESC
      LIMIT $3;
    `,
    minQuality,
    since,
    dailyLimit
  )) as CandidateRow[];

  if (!rows.length) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      failed: 0,
      selected: 0,
      reason: "no eligible outreach candidates",
      config: { dailyLimit, cooldownDays, minQuality },
    });
  }

  const targets = rows.map((r) => ({
    to: String(r.email || "").trim(),
    galleryName: String(r.galleryName || "").trim() || "Gallery",
    country: String(r.country || "").trim() || "Unknown",
    language: normalizeLanguage(r.language),
  }));

  const result = await sendBatchOutreach(targets);

  return NextResponse.json({
    ok: true,
    selected: targets.length,
    sent: result.sent,
    failed: result.failed,
    config: { dailyLimit, cooldownDays, minQuality },
  });
}

