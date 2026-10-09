export const HISTORY_READY_MIN = 3;
export const RICH_HISTORY_MIN = 12;
export const INITIAL_CONSTELLATION = 10;

export type HistoryDensity = "EMPTY" | "LOW_DENSITY" | "HISTORY_READY" | "RICH_HISTORY";
export type DatePrecision = "DAY" | "MONTH" | "YEAR" | "UNKNOWN";
export type ParticipantStatus = "LINKED" | "REVIEW_REQUIRED" | "UNRESOLVED_PARTICIPANT";
export type ContributorKind = "artist" | "gallery" | "institution";

export const HISTORY_EVENTS = [
  "SEARCH_PERFORMED",
  "SEARCH_RESULT_OPENED",
  "ARTIST_OPENED",
  "TIMELINE_YEAR_OPENED",
  "TIMELINE_EVENT_OPENED",
  "CONNECTION_FOLLOWED",
  "SECOND_ARTIST_REACHED",
  "SOURCE_OPENED",
  "START_HISTORY_CLICKED",
  "CLAIM_STARTED",
  "CLAIM_SUBMITTED",
  "EXHIBITION_ADD_STARTED",
  "EXHIBITION_ADDED",
] as const;

export type HistoryEventName = (typeof HISTORY_EVENTS)[number];

export function densityForCount(count: number): HistoryDensity {
  if (count <= 0) return "EMPTY";
  if (count < HISTORY_READY_MIN) return "LOW_DENSITY";
  if (count < RICH_HISTORY_MIN) return "HISTORY_READY";
  return "RICH_HISTORY";
}

export function isIndexEligible(density: HistoryDensity): boolean {
  return density === "HISTORY_READY" || density === "RICH_HISTORY";
}

export function artistSitemapEligible(count: number): boolean {
  return isIndexEligible(densityForCount(count));
}

export function mayPublishHistoryRecord(input: {
  pilotOnly?: boolean;
  usageStatus?: string | null;
  clearance?: string | null;
}): boolean {
  if (input.pilotOnly) return false;
  if (input.usageStatus === "PILOT_ONLY") return false;
  if (!input.clearance || input.clearance === "UNRESOLVED" || input.clearance === "REVIEW_REQUIRED" || input.clearance === "REJECTED") {
    return false;
  }
  return input.clearance === "APPROVED";
}

export function contentGateDecision(input: {
  approvedSources: number;
  importedExhibitions: number;
  historyReady: number;
  rich: number;
}): "PASS" | "PUBLIC_BETA_CONTENT_GATE_BLOCKED" {
  const indexEligible = input.historyReady + input.rich;
  const canDemonstrate =
    input.approvedSources >= 1 &&
    input.importedExhibitions >= 1 &&
    indexEligible >= 1 &&
    (input.rich >= 1 || input.historyReady >= 2);
  return canDemonstrate ? "PASS" : "PUBLIC_BETA_CONTENT_GATE_BLOCKED";
}

export function slugifyName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "artist";
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugifyName(base);
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

export function formatHistoryDate(input: {
  precision: string;
  year: number | null;
  month: number | null;
  day: number | null;
}): string {
  const { precision, year, month, day } = input;
  if (precision === "DAY" && year && month && day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (precision === "MONTH" && year && month) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  if (precision === "YEAR" && year) return String(year);
  return "Date not recorded";
}

export function isFilledMarker(precision: string): boolean {
  return precision === "DAY" || precision === "MONTH";
}

export function classifyParticipant(matchCount: number): ParticipantStatus {
  if (matchCount === 1) return "LINKED";
  if (matchCount > 1) return "REVIEW_REQUIRED";
  return "UNRESOLVED_PARTICIPANT";
}

export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function sharedIds(left: string[], right: string[]): string[] {
  const other = new Set(right);
  return left.filter((id) => other.has(id));
}

export function provenanceLabel(input: {
  official: boolean;
  contributor: ContributorKind | null;
  conflict: boolean;
}): string {
  if (input.conflict) return "Conflict";
  if (input.official && input.contributor === "artist") return "Artist + official source";
  if (input.official) return "Official source";
  if (input.contributor === "artist") return "Artist added";
  if (input.contributor === "gallery") return "Gallery added";
  if (input.contributor === "institution") return "Institution added";
  return "Source not recorded";
}

export function isHistoryEvent(name: string): name is HistoryEventName {
  return (HISTORY_EVENTS as readonly string[]).includes(name);
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function containsRuntimeDdl(source: string): boolean {
  return /\b(ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE|DROP\s+COLUMN)\b/i.test(source);
}

export function omitPrivateClaimFields<T extends Record<string, unknown>>(row: T): Omit<T, "note" | "claims"> {
  const copy = { ...row };
  delete copy.note;
  delete copy.claims;
  return copy;
}

export function legacyArtistRedirect(input: {
  requested: string;
  userId: string | null;
  artistId: string | null;
  slug: string | null;
}): string | null {
  if (!input.slug || input.requested === input.slug) return null;
  if (input.requested === input.userId || input.requested === input.artistId) {
    return `/artists/${input.slug}`;
  }
  return null;
}

export function canonicalArtistPath(slug: string): string {
  return `/artists/${slug}`;
}

export function canonicalExhibitionPath(slugOrId: string): string {
  return `/exhibitions/${slugOrId}`;
}

export function canonicalSpacePath(slugOrId: string): string {
  return `/spaces/${slugOrId}`;
}

type Dated = {
  precision: string;
  year: number | null;
  month: number | null;
  day: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
};

export function validateExhibitionInput(input: { title: string } & Dated): { ok: true } & Dated | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const precision = input.precision;
  if (precision !== "DAY" && precision !== "MONTH" && precision !== "YEAR" && precision !== "UNKNOWN") {
    return { ok: false, error: "Date precision is required." };
  }
  if (precision === "UNKNOWN") {
    if (input.year || input.month || input.day || input.endYear || input.endMonth || input.endDay) {
      return { ok: false, error: "An unknown date cannot include a year, month, or day." };
    }
    return { ok: true, precision, year: null, month: null, day: null, endYear: null, endMonth: null, endDay: null };
  }
  if (!input.year) return { ok: false, error: "A year is required for this precision." };
  if (precision === "YEAR") {
    if (input.month || input.day || input.endMonth || input.endDay) {
      return { ok: false, error: "Year precision cannot include a month or day." };
    }
    return { ok: true, precision, year: input.year, month: null, day: null, endYear: input.endYear ?? null, endMonth: null, endDay: null };
  }
  if (!input.month) return { ok: false, error: "A month is required for this precision." };
  if (precision === "MONTH") {
    if (input.day || input.endDay) return { ok: false, error: "Month precision cannot include a day." };
    return {
      ok: true,
      precision,
      year: input.year,
      month: input.month,
      day: null,
      endYear: input.endYear ?? null,
      endMonth: input.endMonth ?? null,
      endDay: null,
    };
  }
  if (!input.day) return { ok: false, error: "A day is required for day precision." };
  return {
    ok: true,
    precision,
    year: input.year,
    month: input.month,
    day: input.day,
    endYear: input.endYear ?? null,
    endMonth: input.endMonth ?? null,
    endDay: input.endDay ?? null,
  };
}

export function isFirstPartyImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("data:image/") || url.startsWith("/")) return true;
  try {
    const host = new URL(url).hostname;
    return host === "rob-roleofbridge.com" || host.endsWith(".public.blob.vercel-storage.com") || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
