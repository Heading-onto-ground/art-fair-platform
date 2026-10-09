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
  "REPORT_ISSUE_STARTED",
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

export type PublicationStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLIC" | "REJECTED";
export type HistoryOrigin =
  | "ROB_RESEARCHED"
  | "ARTIST_SUBMITTED"
  | "GALLERY_SUBMITTED"
  | "INSTITUTION_SUBMITTED"
  | "LEGACY_FIRST_PARTY";
export type SourceClearance = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED" | "NOT_APPLICABLE";
export type InternalUseDecision = "ALLOW_LIMITED" | "HOLD" | "BLOCK";
export type ExternalPermission = "GRANTED" | "NOT_OBTAINED" | "NOT_APPLICABLE";
export type ContentScope = "FACTUAL_METADATA_ONLY" | "EXPRESSIVE_TEXT" | "IMAGE" | "DATABASE_BULK_CONTENT" | "UNSPECIFIED";
export type PublicBetaDecision =
  | "PUBLIC_BETA_FIRST_PARTY_SEED_READY"
  | "PUBLIC_BETA_CLEARANCE_SEED_READY"
  | "PUBLIC_BETA_CONTENT_GATE_BLOCKED"
  | "PUBLIC_BETA_DATABASE_GATE_BLOCKED";

export const USEFUL_ARTIST_MIN = 3;
export const DENSE_HISTORY_MIN = 8;

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

const FIRST_PARTY_ORIGINS: readonly HistoryOrigin[] = [
  "ARTIST_SUBMITTED",
  "GALLERY_SUBMITTED",
  "INSTITUTION_SUBMITTED",
  "LEGACY_FIRST_PARTY",
];

export function recordIsPublic(input: {
  publicationStatus: string;
  origin: string;
  sourceClearance: string;
  internalUseDecision?: string | null;
  contentScope?: string | null;
}): boolean {
  if (input.publicationStatus !== "PUBLIC" || input.sourceClearance === "REJECTED") return false;
  if (input.origin === "ROB_RESEARCHED") {
    if (input.sourceClearance === "APPROVED") return true;
    return input.internalUseDecision === "ALLOW_LIMITED" && input.contentScope === "FACTUAL_METADATA_ONLY";
  }
  return (FIRST_PARTY_ORIGINS as readonly string[]).includes(input.origin);
}

export function limitedPublicFactualDecision(input: {
  publicPage: boolean;
  loginRequired: boolean;
  paywall: boolean;
  captchaBypass: boolean;
  technicalCircumvention: boolean;
  officialArtSource: boolean;
  factualMetadataOnly: boolean;
  copiesProse: boolean;
  copiesImages: boolean;
  sourceUrlPreserved: boolean;
  bulkDatabaseClone: boolean;
  explicitProhibition: boolean;
  correctionPath: boolean;
  independentGraph: boolean;
}): InternalUseDecision {
  if (input.explicitProhibition || input.loginRequired || input.paywall || input.captchaBypass || input.technicalCircumvention || input.bulkDatabaseClone) {
    return "BLOCK";
  }
  const allowed =
    input.publicPage &&
    input.officialArtSource &&
    input.factualMetadataOnly &&
    !input.copiesProse &&
    !input.copiesImages &&
    input.sourceUrlPreserved &&
    input.correctionPath &&
    input.independentGraph;
  return allowed ? "ALLOW_LIMITED" : "HOLD";
}

export function visitorSourceLabel(sourceName: string | null | undefined): string {
  const name = sourceName?.trim();
  return name ? `Source: ${name}` : "Source not recorded";
}

export function sourceClearanceForSubmission(hasExternalSource: boolean): SourceClearance {
  return hasExternalSource ? "REVIEW_REQUIRED" : "NOT_APPLICABLE";
}

export function firstPartyWrite(input: { claimApproved: boolean; hasExternalSource: boolean }): {
  publicationStatus: PublicationStatus;
  origin: "ARTIST_SUBMITTED";
  sourceClearance: SourceClearance;
  isPublic: boolean;
  contributorKind: ContributorKind | null;
  clearanceStatus: "REVIEW_REQUIRED";
} {
  return {
    origin: "ARTIST_SUBMITTED",
    publicationStatus: input.claimApproved ? "PUBLIC" : "PENDING_REVIEW",
    sourceClearance: sourceClearanceForSubmission(input.hasExternalSource),
    isPublic: input.claimApproved,
    contributorKind: input.claimApproved ? "artist" : null,
    clearanceStatus: "REVIEW_REQUIRED",
  };
}

export function artistAddedLabel(input: { claimApproved: boolean; sourceClearance: string }): string {
  if (!input.claimApproved) return "Pending review";
  if (input.sourceClearance === "APPROVED") return "Artist + official source";
  return "Artist added";
}

export function seoIndexEligible(input: { publicationStatus: string; exhibitionCount: number }): boolean {
  return input.publicationStatus === "PUBLIC" && isIndexEligible(densityForCount(input.exhibitionCount));
}

export function classifyLegacyExhibition(input: {
  isPublic: boolean;
  createdByProfileId: string | null;
  hasHistoryMeta: boolean;
  crawlerWritten: boolean;
}): "LEGACY_FIRST_PARTY" | null {
  if (input.crawlerWritten || input.hasHistoryMeta || !input.isPublic || !input.createdByProfileId) return null;
  return "LEGACY_FIRST_PARTY";
}

export function countBridgePaths(exhibitions: { artistIds: string[] }[]): { paths: number; artists: number } {
  const artists = new Set<string>();
  let paths = 0;
  for (const exhibition of exhibitions) {
    const ids = [...new Set(exhibition.artistIds.filter(Boolean))];
    if (ids.length < 2) continue;
    for (const id of ids) artists.add(id);
    paths += ids.length * (ids.length - 1);
  }
  return { paths, artists: artists.size };
}

export function betaSeedDecision(input: {
  artistsAtLeast1: number;
  artistsAtLeast8: number;
  bridgePaths: number;
  spacesWithExhibitions: number;
}): "PUBLIC_BETA_FIRST_PARTY_SEED_READY" | "PUBLIC_BETA_CONTENT_GATE_BLOCKED" {
  const ready =
    input.artistsAtLeast1 >= USEFUL_ARTIST_MIN &&
    input.artistsAtLeast8 >= 1 &&
    input.bridgePaths >= 1 &&
    input.spacesWithExhibitions >= 1;
  return ready ? "PUBLIC_BETA_FIRST_PARTY_SEED_READY" : "PUBLIC_BETA_CONTENT_GATE_BLOCKED";
}

export function publicBetaDecision(input: {
  databaseConfirmed: boolean;
  recoveryConfirmed: boolean;
  seed: "PUBLIC_BETA_FIRST_PARTY_SEED_READY" | "PUBLIC_BETA_CONTENT_GATE_BLOCKED";
  clearanceSeedReady: boolean;
}): PublicBetaDecision {
  if (!input.databaseConfirmed || !input.recoveryConfirmed) return "PUBLIC_BETA_DATABASE_GATE_BLOCKED";
  if (input.seed === "PUBLIC_BETA_FIRST_PARTY_SEED_READY") return input.seed;
  if (input.clearanceSeedReady) return "PUBLIC_BETA_CLEARANCE_SEED_READY";
  return "PUBLIC_BETA_CONTENT_GATE_BLOCKED";
}

export function selectiveImportDecision(input: {
  usageStatus?: string | null;
  reviewDecision?: string | null;
  requestedIds: string[];
  approvedIds: string[];
}): { ok: boolean; reason: string } {
  if (input.requestedIds.length === 0) return { ok: false, reason: "record-id-required" };
  if (input.reviewDecision !== "APPROVED") return { ok: false, reason: "not-approved" };
  const approved = new Set(input.approvedIds);
  if (!input.requestedIds.every((id) => approved.has(id))) return { ok: false, reason: "not-in-approved-set" };
  return { ok: true, reason: "selective" };
}

export function selectiveImportLog(input: {
  pilotRecordId: string;
  productionEntityId: string | null;
  importedBy: string;
  at: string | null;
}): {
  pilotRecordId: string;
  productionEntityId: string | null;
  sourceDecision: "APPROVED";
  importedAt: string | null;
  importedBy: string;
} {
  return {
    pilotRecordId: input.pilotRecordId,
    productionEntityId: input.productionEntityId,
    sourceDecision: "APPROVED",
    importedAt: input.at,
    importedBy: input.importedBy,
  };
}

export function containsDestructiveSchema(source: string): boolean {
  return /\bDROP\s+(TABLE|COLUMN)\b/i.test(source);
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
