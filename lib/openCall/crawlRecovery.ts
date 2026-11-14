export const LIVE_INSERT_CAP = 20;
export const STALE_SUCCESS_HOURS = 48;
export const MAX_RESPONSE_CHARS = 1_500_000;

export const SYNTHETIC_GALLERY_IDS = [
  "__external_kunsthalle_wien",
  "__external_resartis_global",
  "__external_arthub_partner_space",
  "__external_arthub_regional_program",
  "__external_kart_blog_network",
  "__external_tokas_jp",
  "__external_air_jp",
  "__external_documenta",
  "__external_venice_biennale",
  "__external_art_basel",
  "__external_serpentine",
  "__external_moma_ps1",
  "__external_palais_tokyo",
  "__external_mori",
  "__external_mmca",
  "__external_ucca",
  "__external_acca",
] as const;

type HeaderReader = { get(name: string): string | null };

export function isScheduledCronRequest(headers: HeaderReader): boolean {
  if (headers.get("x-vercel-cron") === "1") return true;
  if (headers.get("x-cron-run") === "1") return true;
  if (String(headers.get("x-vercel-cron-schedule") || "").trim()) return true;
  return String(headers.get("user-agent") || "").toLowerCase().includes("vercel-cron/");
}

export function isReadOnlyCrawl(headers: HeaderReader): boolean {
  return String(headers.get("x-crawl-mode") || "").trim().toLowerCase() === "read-only";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function endOfUtcDay(iso: string): number {
  return new Date(`${iso}T23:59:59Z`).getTime();
}

export function parseExplicitDeadline(input: string, now = new Date()): string | null {
  const text = String(input || "");
  const dated = Array.from(text.matchAll(/(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/g));
  if (dated.length > 0) {
    const last = dated[dated.length - 1];
    return isoDate(Number(last[1]), Number(last[2]), Number(last[3]));
  }
  const short = Array.from(text.matchAll(/(?:^|[^\d])(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?!\d)/g));
  const year = now.getUTCFullYear();
  const today = Date.UTC(year, now.getUTCMonth(), now.getUTCDate());
  for (let index = short.length - 1; index >= 0; index -= 1) {
    const month = Number(short[index][1]);
    const day = Number(short[index][2]);
    const iso = isoDate(year, month, day);
    if (!iso) continue;
    if (endOfUtcDay(iso) >= today) return iso;
  }
  return null;
}

export function deadlineFromOpportunityText(input: {
  title?: string;
  category?: string;
  description?: string;
  pubDate?: string;
}, now = new Date()): string | null {
  const content = `${input.title || ""} ${input.category || ""} ${input.description || ""}`;
  return parseExplicitDeadline(content, now);
}

export function rejectionReason(text: string): "RESULT_ANNOUNCEMENT" | "EXHIBITION_ANNOUNCEMENT" | null {
  const value = String(text || "");
  if (/선정\s*결과|모집\s*결과|결과\s*발표|results?\s+announcement|selected\s+artists|winners?\s+announced/i.test(value)) {
    return "RESULT_ANNOUNCEMENT";
  }
  const exhibition = /전시\s*안내|전시\s*후기|exhibition\s+announcement|now\s+on\s+view|opening\s+reception/i.test(value);
  const application = /오픈콜|공모|작가\s*모집|call\s+for\s+artists|open\s+call|residency|deadline|지원|입주/i.test(value);
  if (exhibition && !application) return "EXHIBITION_ANNOUNCEMENT";
  return null;
}

export function isActiveDeadline(deadline: string, now = Date.now()): boolean {
  const value = String(deadline || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const end = endOfUtcDay(value);
  return Number.isFinite(end) && end >= now;
}

export function isSyntheticCrawlRow(galleryId: string): boolean {
  return (SYNTHETIC_GALLERY_IDS as readonly string[]).includes(String(galleryId || ""));
}

export function openCallIdentityKey(input: {
  gallery?: string;
  country?: string;
  city?: string;
  theme?: string;
  deadline?: string;
  externalUrl?: string;
  galleryWebsite?: string;
}): string {
  const host = hostFromUrl(input.externalUrl || input.galleryWebsite);
  const theme = normalize(input.theme);
  const deadline = String(input.deadline || "").trim();
  if (host) return `h:${host}|d:${deadline}|t:${theme}`;
  return `g:${normalize(input.gallery)}|c:${normalize(input.country)}|city:${normalize(input.city)}|d:${deadline}|t:${theme}`;
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalize(value?: string) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export type CrawlCandidate = {
  source: string;
  gallery: string;
  galleryId: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  externalUrl?: string;
  externalEmail?: string;
  galleryWebsite?: string;
  galleryDescription?: string;
  isExternal?: boolean;
};

export function planCrawlInserts(input: {
  candidates: CrawlCandidate[];
  existingKeys: Set<string>;
  existingUrls: Set<string>;
  now?: number;
  cap?: number;
}) {
  const now = input.now ?? Date.now();
  const cap = input.cap ?? LIVE_INSERT_CAP;
  const seen = new Set<string>();
  const rejected: Array<{ source: string; theme: string; reason: string }> = [];
  const expired: CrawlCandidate[] = [];
  const duplicates: CrawlCandidate[] = [];
  const synthetic: CrawlCandidate[] = [];
  const accepted: CrawlCandidate[] = [];
  for (const candidate of input.candidates) {
    if (isSyntheticCrawlRow(candidate.galleryId)) {
      synthetic.push(candidate);
      rejected.push({ source: candidate.source, theme: candidate.theme, reason: "FALLBACK_ONLY" });
      continue;
    }
    const reason = rejectionReason(`${candidate.theme} ${candidate.gallery}`);
    if (reason) {
      rejected.push({ source: candidate.source, theme: candidate.theme, reason });
      continue;
    }
    if (!candidate.externalUrl) {
      rejected.push({ source: candidate.source, theme: candidate.theme, reason: "INVALID_URL" });
      continue;
    }
    if (!isActiveDeadline(candidate.deadline, now)) {
      expired.push(candidate);
      rejected.push({ source: candidate.source, theme: candidate.theme, reason: "DEADLINE_EXPIRED" });
      continue;
    }
    const key = openCallIdentityKey(candidate);
    if (input.existingKeys.has(key) || seen.has(key) || input.existingUrls.has(candidate.externalUrl)) {
      duplicates.push(candidate);
      rejected.push({ source: candidate.source, theme: candidate.theme, reason: "DUPLICATE" });
      continue;
    }
    seen.add(key);
    accepted.push(candidate);
  }
  return {
    wouldInsert: accepted.slice(0, cap),
    heldByCap: accepted.slice(cap),
    expired,
    duplicates,
    synthetic,
    rejected,
  };
}

export function externalIdsSafeToExpire(rows: Array<{ id: string; isExternal?: boolean; deadline: string }>, now = Date.now()) {
  return rows
    .filter((row) => row.isExternal === true && !isActiveDeadline(row.deadline, now))
    .map((row) => row.id);
}

export async function settleSources<T>(jobs: Array<{ source: string; run: () => Promise<T[]> }>) {
  return Promise.all(jobs.map(async (job) => {
    const started = Date.now();
    try {
      const rows = await job.run();
      return { source: job.source, ok: true, rows, durationMs: Date.now() - started, error: null as string | null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "source failed";
      return { source: job.source, ok: false, rows: [] as T[], durationMs: Date.now() - started, error: message };
    }
  }));
}

export function crawlRunStatus(input: { sourceAttempts: number; sourceFailures: number; fatal: boolean }) {
  if (input.fatal || input.sourceAttempts === 0 || input.sourceFailures === input.sourceAttempts) return "error" as const;
  if (input.sourceFailures > 0) return "partial" as const;
  return "success" as const;
}

export function isCrawlStale(lastSuccessAt: Date | null, now = Date.now(), hours = STALE_SUCCESS_HOURS) {
  if (!lastSuccessAt) return true;
  return now - lastSuccessAt.getTime() > hours * 60 * 60 * 1000;
}

export async function commitCrawlEffects(input: {
  readOnly: boolean;
  create: (row: CrawlCandidate) => Promise<void>;
  deleteExpired: (ids: string[]) => Promise<void>;
  deleteExhibitionJunk: () => Promise<void>;
  syncEmail: () => Promise<void>;
  validate: () => Promise<void>;
  creates: CrawlCandidate[];
  expiredIds: string[];
}) {
  if (input.readOnly) {
    return { created: 0, deletedExpired: 0, deletedJunk: false, email: false, validation: false };
  }
  for (const row of input.creates) await input.create(row);
  if (input.expiredIds.length) await input.deleteExpired(input.expiredIds);
  await input.deleteExhibitionJunk();
  await input.syncEmail();
  await input.validate();
  return {
    created: input.creates.length,
    deletedExpired: input.expiredIds.length,
    deletedJunk: true,
    email: true,
    validation: true,
  };
}
