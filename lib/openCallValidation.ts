import { listOpenCalls, OpenCall } from "@/app/data/openCalls";
import { prisma } from "@/lib/prisma";

export type OpenCallValidationStatus = "verified" | "suspicious" | "invalid" | "unreachable";

type ValidationRow = {
  openCallId: string;
  status: OpenCallValidationStatus;
  reason: string | null;
  checkedUrl: string | null;
  httpStatus: number | null;
  confidence: number;
  checkedAt: Date;
};

type ValidationLike = {
  status?: string;
  reason?: string | null;
};

const OPEN_CALL_KEYWORDS = [
  "open call",
  "call for artists",
  "residency",
  "submission",
  "apply",
  "application",
  "공모",
  "오픈콜",
  "레지던시",
  "지원",
];

let ensured = false;

function normalizeText(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function urlCandidate(call: OpenCall) {
  const url = String(call.externalUrl || call.galleryWebsite || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  return url;
}

function themeTokens(input: string) {
  const words = normalizeText(input)
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 4)
    .slice(0, 10);
  return Array.from(new Set(words));
}

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function fetchPage(url: string) {
  const t = timeoutSignal(12000);
  try {
    const res = await fetch(url, {
      signal: t.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "ROB-OpenCall-Validator/1.0 (+https://rob-roleofbridge.com)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const status = res.status;
    const finalUrl = res.url || url;
    if (!res.ok) {
      return { ok: false, status, finalUrl, text: "" };
    }
    const text = normalizeText(await res.text());
    return { ok: true, status, finalUrl, text };
  } catch {
    return { ok: false, status: 0, finalUrl: url, text: "" };
  } finally {
    t.clear();
  }
}

function evaluateContent(call: OpenCall, text: string, finalUrl: string) {
  const expectedHost = hostFromUrl(call.externalUrl || call.galleryWebsite);
  const finalHost = hostFromUrl(finalUrl);
  const tokens = themeTokens(`${call.theme} ${call.gallery}`);

  const hasOpenCallKeyword = OPEN_CALL_KEYWORDS.some((k) => text.includes(normalizeText(k)));
  const tokenHits = tokens.filter((t) => text.includes(t)).length;
  const hostMatch = !!expectedHost && expectedHost === finalHost;

  let confidence = 0;
  if (hostMatch) confidence += 25;
  if (hasOpenCallKeyword) confidence += 45;
  if (tokenHits >= 2) confidence += 30;
  else if (tokenHits === 1) confidence += 15;

  if (hasOpenCallKeyword || tokenHits >= 2) {
    return { status: "verified" as const, reason: "content_matched", confidence };
  }
  if (tokenHits === 1 || hostMatch) {
    return { status: "suspicious" as const, reason: "partial_match", confidence };
  }
  return { status: "invalid" as const, reason: "content_not_relevant", confidence };
}

export function isOpenCallDeadlineActive(deadline: string) {
  const d = String(deadline || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const endOfDayUtc = new Date(`${d}T23:59:59Z`);
  if (Number.isNaN(endOfDayUtc.getTime())) return false;
  return endOfDayUtc.getTime() >= Date.now();
}

export function shouldHideOpenCallByValidation(validation?: ValidationLike) {
  if (!validation) return false;
  return String(validation.status || "").toLowerCase() === "invalid";
}

async function validateOne(call: OpenCall): Promise<ValidationRow> {
  const checkedAt = new Date();
  const url = urlCandidate(call);
  if (!url) {
    return {
      openCallId: call.id,
      status: "invalid",
      reason: "missing_or_invalid_url",
      checkedUrl: null,
      httpStatus: null,
      confidence: 0,
      checkedAt,
    };
  }

  const page = await fetchPage(url);
  if (!page.ok) {
    if (page.status >= 400) {
      return {
        openCallId: call.id,
        status: "invalid",
        reason: `http_${page.status}`,
        checkedUrl: page.finalUrl,
        httpStatus: page.status,
        confidence: 0,
        checkedAt,
      };
    }
    return {
      openCallId: call.id,
      status: "unreachable",
      reason: "network_error_or_timeout",
      checkedUrl: page.finalUrl,
      httpStatus: page.status || null,
      confidence: 0,
      checkedAt,
    };
  }

  const result = evaluateContent(call, page.text, page.finalUrl);
  return {
    openCallId: call.id,
    status: result.status,
    reason: result.reason,
    checkedUrl: page.finalUrl,
    httpStatus: page.status,
    confidence: result.confidence,
    checkedAt,
  };
}

export async function ensureOpenCallValidationTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpenCallValidation" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "openCallId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'suspicious',
      "reason" TEXT,
      "checkedUrl" TEXT,
      "httpStatus" INTEGER,
      "confidence" INTEGER NOT NULL DEFAULT 0,
      "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OpenCallValidation_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "OpenCallValidation_openCallId_key" ON "OpenCallValidation" ("openCallId");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "OpenCallValidation_status_idx" ON "OpenCallValidation" ("status");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "OpenCallValidation_checkedAt_idx" ON "OpenCallValidation" ("checkedAt");`
  );
  ensured = true;
}

async function upsertValidation(rows: ValidationRow[]) {
  await ensureOpenCallValidationTable();
  for (const row of rows) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "OpenCallValidation"
        ("openCallId", "status", "reason", "checkedUrl", "httpStatus", "confidence", "checkedAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT ("openCallId")
      DO UPDATE SET
        "status" = EXCLUDED."status",
        "reason" = EXCLUDED."reason",
        "checkedUrl" = EXCLUDED."checkedUrl",
        "httpStatus" = EXCLUDED."httpStatus",
        "confidence" = EXCLUDED."confidence",
        "checkedAt" = EXCLUDED."checkedAt",
        "updatedAt" = NOW();
      `,
      row.openCallId,
      row.status,
      row.reason,
      row.checkedUrl,
      row.httpStatus,
      row.confidence,
      row.checkedAt
    );
  }
}

export async function validateExternalOpenCalls() {
  const all = await listOpenCalls();
  const external = all.filter((c) => c.isExternal);
  const results: ValidationRow[] = [];
  for (const call of external) {
    results.push(await validateOne(call));
  }
  await upsertValidation(results);

  const prunableInvalidIds = results
    .filter((r) => r.status === "invalid")
    .map((r) => r.openCallId);
  const prunableExpiredIds = external
    .filter((c) => !isOpenCallDeadlineActive(String(c.deadline || "")))
    .map((c) => c.id);
  const pruneIds = Array.from(new Set([...prunableInvalidIds, ...prunableExpiredIds]));
  let pruned = 0;
  if (pruneIds.length > 0) {
    const deleted = await prisma.openCall.deleteMany({
      where: {
        id: { in: pruneIds },
        isExternal: true,
      },
    });
    pruned = deleted.count;
  }

  const counts = {
    total: results.length,
    verified: results.filter((r) => r.status === "verified").length,
    suspicious: results.filter((r) => r.status === "suspicious").length,
    invalid: results.filter((r) => r.status === "invalid").length,
    unreachable: results.filter((r) => r.status === "unreachable").length,
    pruned,
  };
  return counts;
}

export async function getOpenCallValidationMap(openCallIds: string[]) {
  await ensureOpenCallValidationTable();
  if (openCallIds.length === 0) return new Map<string, ValidationRow>();
  const rows = (await prisma.$queryRawUnsafe(
    `
    SELECT "openCallId", "status", "reason", "checkedUrl", "httpStatus", "confidence", "checkedAt"
    FROM "OpenCallValidation"
    WHERE "openCallId" = ANY($1::text[])
    `,
    openCallIds
  )) as Array<{
    openCallId: string;
    status: OpenCallValidationStatus;
    reason: string | null;
    checkedUrl: string | null;
    httpStatus: number | null;
    confidence: number;
    checkedAt: Date;
  }>;

  return new Map(
    rows.map((r) => [
      r.openCallId,
      {
        openCallId: r.openCallId,
        status: r.status,
        reason: r.reason,
        checkedUrl: r.checkedUrl,
        httpStatus: r.httpStatus,
        confidence: Number(r.confidence || 0),
        checkedAt: r.checkedAt instanceof Date ? r.checkedAt : new Date(r.checkedAt),
      },
    ])
  );
}
