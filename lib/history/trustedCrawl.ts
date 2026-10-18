import { chronologySubject, galleryChronologyRows } from "@/lib/history/galleryChronology";
import { VERIFIED_ALIASES, mayCreateParticipation, normalizeArtistLookup, resolveArtistSlug, resolveVerifiedAlias, type ParticipantEvidence } from "@/lib/history/identity";
import {
  aicExhibition,
  clevelandExhibitions,
  clevelandHtmlExhibition,
  classifyFetchedPage,
  tateExhibition,
  type PageType,
} from "@/lib/history/institutionPages";
import {
  VERIFIED_SPACES,
  duplicateDecision,
  normalizeFactTitle,
  previewCandidates,
  resolveVerifiedSpace,
  type DuplicateDecision,
  type FactualCandidate,
  type GrowthSnapshot,
  type SourceClass,
} from "@/lib/history/growth";

export type SourceTier = "OFFICIAL_GALLERY" | "MUSEUM" | "FIRST_PARTY" | "MUSEUM_API" | "REFERENCE" | "LOW_AUTHORITY";
export type CrawlConfidence = "HIGH" | "MEDIUM" | "LOW";
export type CrawlDecision = "AUTO_IMPORT" | "REVIEW_QUEUE" | "HOLD" | "SOURCE_UNAVAILABLE";
export type SpaceDecision = "RESOLVED" | "REVIEW" | "NEW" | "MISSING";

export type TrustedSource = {
  host: string;
  sourceName: string;
  sourceClass: SourceClass;
  sourceTier: SourceTier;
  adapter: "kukje-exhibition" | "hyundai-exhibition" | "arario-exhibition" | "foundation-cv" | "museum-api" | "mmca-exhibition" | "tate-exhibition" | "aic-exhibition" | "cleveland-exhibition";
  autoImport: boolean;
};

/**
 * Level 1 reads only these hosts. Public factual fields may be extracted.
 * Biography, reviews, and images are not stored.
 */
export const TRUSTED_SOURCES: readonly TrustedSource[] = [
  { host: "kukjegallery.com", sourceName: "Kukje Gallery", sourceClass: "GALLERY_CV", sourceTier: "OFFICIAL_GALLERY", adapter: "kukje-exhibition", autoImport: true },
  { host: "galleryhyundai.com", sourceName: "Gallery Hyundai", sourceClass: "GALLERY_CV", sourceTier: "OFFICIAL_GALLERY", adapter: "hyundai-exhibition", autoImport: true },
  { host: "arariogallery.com", sourceName: "Arario Gallery", sourceClass: "GALLERY_CV", sourceTier: "OFFICIAL_GALLERY", adapter: "arario-exhibition", autoImport: true },
  { host: "moma.org", sourceName: "Museum of Modern Art", sourceClass: "MUSEUM_API", sourceTier: "MUSEUM_API", adapter: "museum-api", autoImport: true },
  { host: "guggenheim.org", sourceName: "Guggenheim", sourceClass: "MUSEUM_API", sourceTier: "MUSEUM_API", adapter: "museum-api", autoImport: true },
  { host: "naa.go.kr", sourceName: "National Academy of Arts", sourceClass: "INSTITUTION", sourceTier: "FIRST_PARTY", adapter: "foundation-cv", autoImport: true },
  { host: "mmca.go.kr", sourceName: "MMCA", sourceClass: "MUSEUM", sourceTier: "MUSEUM", adapter: "mmca-exhibition", autoImport: true },
  { host: "tate.org.uk", sourceName: "Tate", sourceClass: "MUSEUM", sourceTier: "MUSEUM", adapter: "tate-exhibition", autoImport: true },
  { host: "artic.edu", sourceName: "Art Institute of Chicago", sourceClass: "MUSEUM", sourceTier: "MUSEUM", adapter: "aic-exhibition", autoImport: true },
  { host: "api.artic.edu", sourceName: "Art Institute of Chicago", sourceClass: "MUSEUM_API", sourceTier: "MUSEUM_API", adapter: "aic-exhibition", autoImport: true },
  { host: "clevelandart.org", sourceName: "Cleveland Museum of Art", sourceClass: "MUSEUM", sourceTier: "MUSEUM", adapter: "cleveland-exhibition", autoImport: true },
  { host: "openaccess-api.clevelandart.org", sourceName: "Cleveland Museum of Art", sourceClass: "MUSEUM_API", sourceTier: "MUSEUM_API", adapter: "cleveland-exhibition", autoImport: true },
];

export const CRAWL_LIMITS = {
  timeoutMs: 20_000,
  maxAttempts: 3,
  domainIntervalMs: 1_000,
  maxBytes: 1_500_000,
  userAgent: "ROB-trusted-crawler/1.0",
  selectiveCvRows: 12,
} as const;

export type CrawlParticipant = {
  label: string;
  slug: string | null;
  evidence: ParticipantEvidence;
  identity: "EXACT" | "UNRESOLVED";
  evidenceLocation: string;
};

export type CrawlCurator = {
  rawName: string;
  evidenceType: "EXPLICIT_CURATOR";
};

export type FieldSource = { sourceName: string; sourceUrl: string };

export type CrawlFact = {
  pilotRecordId: string;
  title: string | null;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  datePrecision: "DAY" | "MONTH" | "YEAR" | "UNKNOWN";
  venue: string | null;
  city: string | null;
  country: string | null;
  participants: CrawlParticipant[];
  curators: CrawlCurator[];
  confidence: CrawlConfidence;
  decision: CrawlDecision;
  reason: string;
  duplicate: DuplicateDecision | null;
  alreadyRecorded: boolean;
  graph: { newExhibition: boolean; newArtistPairCount: number; chronologyValue: "NEW_YEAR" | "DENSIFY" | "NONE" } | null;
  contentScope: "FACTUAL_METADATA_ONLY";
  provenance: {
    sourceName: string;
    sourceUrl: string;
    retrievedAt: string;
    sourceClass: SourceClass;
    sourceTier: SourceTier;
    extractionMethod: string;
    titleSource: FieldSource | null;
    dateSource: FieldSource | null;
    venueSource: FieldSource | null;
    citySource: FieldSource | null;
    countrySource: FieldSource | null;
    participantSource: FieldSource | null;
    curatorSource: FieldSource | null;
  };
  fieldProvenance: {
    title: FieldSource | null;
    date: FieldSource | null;
    venue: FieldSource | null;
    city: FieldSource | null;
    country: FieldSource | null;
    participants: FieldSource | null;
    curators: FieldSource | null;
  };
  pageType: PageType;
};

export type TrustedImportBatch = {
  importVersion: "trusted-crawler-v1";
  job: {
    sourceId: string;
    sourceName: string;
    sourceUrl: string;
    sourceClass: SourceClass;
    targetArtists: string[];
    retrievedAt: string;
    extractionMode: "STRUCTURED_FILE";
    contentScope: "FACTUAL_METADATA_ONLY";
    notes: string;
  };
  artists: {
    slug: string;
    canonicalName: string;
    nativeName: string | null;
    birthYear: null;
    country: null;
    officialWebsite: string | null;
  }[];
  enrichments: {
    pilotRecordId: string;
    title: string;
    year: number;
    space: string;
    participants: string[];
    sourceName: string;
    sourceUrl: string;
    evidenceShort: string;
  }[];
  records: {
    pilotRecordId: string;
    title: string;
    year: number;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    datePrecision: "DAY" | "MONTH" | "YEAR";
    venue: string;
    city: string;
    country: string;
    participants: string[];
    sourceName: string;
    sourceUrl: string;
    sourceType: "OFFICIAL_GALLERY_PAGE" | "MUSEUM_API";
    evidenceShort: string;
  }[];
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5,
  june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type DateParts = { year: number | null; month: number | null; day: number | null };

export function classifyTrustedUrl(url: string): TrustedSource | null {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  return TRUSTED_SOURCES.find((source) => host === source.host) ?? null;
}

export function crawlArtists(seeds: { slug?: string; labels?: string[] }[]): { slug: string; labels: string[] }[] {
  const map = new Map<string, Set<string>>();
  for (const alias of VERIFIED_ALIASES) {
    const labels = map.get(alias.slug) ?? new Set<string>();
    labels.add(alias.label);
    map.set(alias.slug, labels);
  }
  for (const seed of seeds) {
    if (!seed.slug) continue;
    const labels = map.get(seed.slug) ?? new Set<string>();
    for (const label of seed.labels ?? []) if (label.trim()) labels.add(label.trim());
    map.set(seed.slug, labels);
  }
  return [...map.entries()].map(([slug, labels]) => ({ slug, labels: [...labels] }));
}

export function crawlTrustedPage(input: {
  url: string;
  retrievedAt: string;
  html?: string;
  json?: unknown;
  text?: string;
  subjectLabel?: string | null;
  artists: { slug: string; labels: string[] }[];
  snapshot: GrowthSnapshot;
  snapshotReady?: boolean;
}): CrawlFact[] {
  const source = classifyTrustedUrl(input.url);
  if (!source) return [heldFact(input, null, "LOW_AUTHORITY", "LOW_AUTHORITY")];
  const path = pathOf(input.url);
  if (source.adapter === "kukje-exhibition" && path.includes("/news/")) return [heldFact(input, source, "PRESS_PAGE", "PRESS_PAGE", "PRESS")];
  if (source.adapter === "tate-exhibition") return crawlTate(input, source);
  if (source.adapter === "aic-exhibition") return crawlAic(input, source);
  if (source.adapter === "cleveland-exhibition") return crawlCleveland(input, source);
  if (source.adapter === "foundation-cv") return crawlFoundationCv(input, source);
  if (source.adapter === "museum-api") return crawlMuseumApi(input, source);
  if (source.adapter === "mmca-exhibition") return [crawlMmcaExhibition(input, source)];
  if (!input.html) return [heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE")];
  if (source.adapter === "kukje-exhibition" && path.includes("/artists/view")) return crawlKukjeChronology(input, source);
  if (source.adapter === "kukje-exhibition" && path.includes("/exhibitions/")) return [crawlKukjeExhibition(input, source)];
  if (source.adapter === "hyundai-exhibition" && path.includes("/exhibition/")) return [crawlGalleryHyundaiExhibition(input, source)];
  if (source.adapter === "arario-exhibition" && path.includes("/exhibitions/")) return [crawlArarioExhibition(input, source)];
  return [heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE")];
}

export function trustedCrawlReport(facts: CrawlFact[]) {
  const writing = facts.filter((fact) => fact.decision === "AUTO_IMPORT" && !fact.alreadyRecorded);
  const unresolved = new Set<string>();
  for (const fact of facts) {
    for (const person of fact.participants) {
      if (person.evidence === "EXPLICIT_PARTICIPANT" && person.identity === "UNRESOLVED") unresolved.add(person.label);
    }
  }
  return {
    level: 1 as const,
    facts: facts.length,
    autoImport: writing.length,
    alreadyRecorded: facts.filter((fact) => fact.alreadyRecorded).length,
    reviewQueue: facts.filter((fact) => fact.decision === "REVIEW_QUEUE").length,
    hold: facts.filter((fact) => fact.decision === "HOLD").length,
    sourceUnavailable: facts.filter((fact) => fact.decision === "SOURCE_UNAVAILABLE").length,
    exhibitions: writing.filter((fact) => fact.duplicate === "NEW").length,
    participations: writing.reduce((sum, fact) => sum + edgeLabels(fact).length, 0),
    unresolvedIdentities: unresolved.size,
  };
}

export function trustedImportBatch(facts: CrawlFact[], retrievedAt: string, snapshot?: GrowthSnapshot): TrustedImportBatch | null {
  const writing = facts.filter((fact) => fact.decision === "AUTO_IMPORT" && !fact.alreadyRecorded && edgeLabels(fact).length > 0);
  if (writing.length === 0) return null;
  const present = new Set(snapshot?.artists.map((artist) => artist.slug) ?? []);
  const slugs = [...new Set(writing.flatMap((fact) => edgeLabels(fact).map((person) => person.slug).filter((slug): slug is string => Boolean(slug))))];
  return {
    importVersion: "trusted-crawler-v1",
    job: {
      sourceId: `trusted-${retrievedAt}`,
      sourceName: [...new Set(writing.map((fact) => fact.provenance.sourceName))].join(", "),
      sourceUrl: writing[0]?.provenance.sourceUrl ?? "",
      sourceClass: writing[0]?.provenance.sourceClass ?? "OTHER",
      targetArtists: slugs,
      retrievedAt,
      extractionMode: "STRUCTURED_FILE",
      contentScope: "FACTUAL_METADATA_ONLY",
      notes: "Trusted-source crawler. Only explicit participants with an exact identity are included. Title mentions stay out of this batch.",
    },
    artists: slugs.filter((slug) => !present.has(slug)).map((slug) => artistPlan(slug, writing)).filter((artist): artist is TrustedImportBatch["artists"][number] => Boolean(artist)),
    enrichments: writing.filter((fact) => fact.duplicate === "EXACT").map((fact) => ({
      pilotRecordId: fact.pilotRecordId,
      title: fact.title ?? "",
      year: fact.startYear ?? 0,
      space: fact.venue ?? "",
      participants: edgeLabels(fact).map((person) => person.label),
      sourceName: fact.provenance.sourceName,
      sourceUrl: fact.provenance.sourceUrl,
      evidenceShort: evidenceLine(fact),
    })),
    records: writing.filter((fact) => fact.duplicate === "NEW").map((fact) => ({
      pilotRecordId: fact.pilotRecordId,
      title: fact.title ?? "",
      year: fact.startYear ?? 0,
      startMonth: fact.startMonth,
      startDay: fact.startDay,
      endYear: fact.endYear,
      endMonth: fact.endMonth,
      endDay: fact.endDay,
      datePrecision: fact.datePrecision === "UNKNOWN" ? "YEAR" : fact.datePrecision,
      venue: fact.venue ?? "",
      city: fact.city ?? "",
      country: fact.country ?? "",
      participants: edgeLabels(fact).map((person) => person.label),
      sourceName: fact.provenance.sourceName,
      sourceUrl: fact.provenance.sourceUrl,
      sourceType: fact.provenance.sourceClass === "MUSEUM_API" ? "MUSEUM_API" as const : "OFFICIAL_GALLERY_PAGE" as const,
      evidenceShort: evidenceLine(fact),
    })),
  };
}

function crawlKukjeExhibition(input: CrawlInput, source: TrustedSource): CrawlFact {
  const html = input.html ?? "";
  const labels = elementTexts(html, "page-main-list-artist__name-text").flatMap(splitArtistField);
  const title = elementTexts(html, "page-main-list-artist__exhibition")[0] ?? null;
  const dates = parseRange(elementTexts(html, "page-main-list-time")[0] ?? "");
  const city = kukjeCity(elementTexts(html, "page-main-list-area__title")[0] ?? "", html);
  const participants = labels.length > 0
    ? labels.map((label) => participant(label, "EXPLICIT_PARTICIPANT", input.artists, "artist-link"))
    : title && isNameListTitle(title)
      ? [participant(title, "TITLE_ONLY", input.artists, "title")]
      : [];
  return finishFact(input, source, {
    title,
    dates,
    venue: title ? "Kukje Gallery" : null,
    city,
    country: city === "Seoul" || city === "Busan" ? "Korea" : null,
    participants,
    extractionMethod: "KUKJE_EXHIBITION_HEADER",
  });
}

function crawlKukjeChronology(input: CrawlInput, source: TrustedSource): CrawlFact[] {
  const html = input.html ?? "";
  const labels = [...new Set(input.artists.flatMap((artist) => artist.labels))];
  const subject = chronologySubject(html, labels);
  if (!subject) return [heldFact(input, source, "CHRONOLOGY_UNATTRIBUTED", "KUKJE_ARTIST_CHRONOLOGY", "ARTIST_PROFILE")];
  const rows = galleryChronologyRows(html);
  if (rows.length === 0) return [heldFact(input, source, "NO_STRUCTURE", "KUKJE_ARTIST_CHRONOLOGY", "ARTIST_PROFILE")];
  const selected = [...rows]
    .sort((left, right) => Number(/solo/i.test(right.section)) - Number(/solo/i.test(left.section)) || right.year - left.year)
    .slice(0, CRAWL_LIMITS.selectiveCvRows);
  return selected.map((row) => finishFact(input, source, {
    title: row.title,
    dates: {
      start: { year: row.year, month: null, day: null },
      end: { year: null, month: null, day: null },
      precision: "YEAR",
    },
    venue: row.venue,
    city: row.city,
    country: row.country,
    participants: [participant(subject, "EXPLICIT_PARTICIPANT", input.artists, `chronology:${row.section}`)],
    extractionMethod: "KUKJE_ARTIST_CHRONOLOGY",
  }));
}

function crawlGalleryHyundaiExhibition(input: CrawlInput, source: TrustedSource): CrawlFact {
  const html = input.html ?? "";
  const labels = elementTexts(html, "exd-title__artist").flatMap(splitArtistField);
  const title = elementTexts(html, "exd-title__sub")[0] ?? null;
  const facts = paragraphTexts(block(html, "exd-title__facts") ?? "");
  const dates = parseRange(facts[0] ?? "");
  const venue = facts[1] ?? null;
  const participants = labels.length > 0
    ? labels.map((label) => participant(label, "EXPLICIT_PARTICIPANT", input.artists, "artist-field"))
    : title && isNameListTitle(title)
      ? [participant(title, "TITLE_ONLY", input.artists, "title")]
      : [];
  return finishFact(input, source, {
    title,
    dates,
    venue,
    city: null,
    country: null,
    participants,
    extractionMethod: "HYUNDAI_EXHIBITION_HEADER",
  });
}

function crawlArarioExhibition(input: CrawlInput, source: TrustedSource): CrawlFact {
  const html = input.html ?? "";
  const heading = elementTexts(html, "h1_heading")[0] ?? "";
  const dates = parseRange(elementTexts(html, "subtitle_date")[0] ?? "");
  const city = elementTexts(html, "location").find((value) => value.length > 0 && value.length <= 40) ?? null;
  const nameList = isNameListTitle(heading);
  const splitAt = heading.indexOf(":");
  const title = nameList ? heading : splitAt >= 0 ? heading.slice(splitAt + 1).trim() : heading || null;
  const venue = title ? (city && city !== "Seoul" ? `Arario Gallery ${city}` : "Arario Gallery") : null;
  const participants = nameList
    ? [participant(heading, "TITLE_ONLY", input.artists, "title")]
    : splitAt >= 0
      ? [participant(heading.slice(0, splitAt).trim(), "AMBIGUOUS", input.artists, "heading")]
      : [];
  return finishFact(input, source, {
    title: title || null,
    dates,
    venue,
    city,
    country: null,
    participants,
    extractionMethod: "ARARIO_EXHIBITION_HEADER",
  });
}

function crawlMmcaExhibition(input: CrawlInput, source: TrustedSource): CrawlFact {
  const html = input.html ?? "";
  if (!html.trim()) return heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE");
  const title = headingTitle(html);
  const fields = definitionFields(html);
  const period = parseRange(fields.get("period") ?? "");
  const beside = parseRange(firstBarDate(html) ?? "");
  const artistField = fields.get("artist") ?? "";
  const names = splitArtistField(artistField);
  const curatorField = fields.get("curator") ?? fields.get("curated by") ?? "";
  const organizer = fields.get("organized by/supported by") ?? fields.get("organized by") ?? "";
  const room = fields.get("venue") ?? "";
  const alias = explicitSpaceAlias([organizer, room].filter(Boolean).join(" "));
  const placeText = [room, organizer, documentTitle(html)].filter(Boolean).join(" ");
  return finishFact(input, source, {
    title,
    dates: period.start.year ? period : beside,
    dateConflict: rangesConflict(period, beside),
    venue: alias ?? (room || null),
    city: namedPlace(placeText, ["Seoul", "Busan", "Gwacheon"]),
    country: namedPlace(placeText, ["Korea"]),
    participants: names.map((label) => participant(label, "EXPLICIT_PARTICIPANT", input.artists, "artist-field")),
    curators: splitArtistField(curatorField).map((rawName) => ({ rawName, evidenceType: "EXPLICIT_CURATOR" as const })),
    extractionMethod: "MMCA_EXHIBITION_FIELDS",
  });
}

function crawlFoundationCv(input: CrawlInput, source: TrustedSource): CrawlFact[] {
  const lines = datedCvLines(input.text ?? input.html ?? "");
  if (lines.length === 0) return [heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE")];
  const facts = lines.map((line) => {
    const year = Number(line.slice(0, 4));
    const title = line.slice(4).replace(/^[\s.:-]+/, "").trim();
    const explicit = explicitCvArtists(line);
    const participants = explicit.length > 0
      ? explicit.map((label) => participant(label, "EXPLICIT_PARTICIPANT", input.artists, "cv-line"))
      : input.subjectLabel
        ? [participant(input.subjectLabel, "AMBIGUOUS", input.artists, "cv-line")]
        : [];
    return finishFact(input, source, {
      title: title || null,
      dates: { start: { year, month: null, day: null }, end: { year, month: null, day: null }, precision: "YEAR" },
      venue: null,
      city: null,
      country: null,
      participants,
      extractionMethod: "FOUNDATION_CV_LINE",
    });
  });
  const fresh = facts.filter((fact) => fact.duplicate !== "EXACT");
  return (fresh.length > 0 ? fresh : facts).slice(0, CRAWL_LIMITS.selectiveCvRows);
}

function datedRange(value: string): { start: DateParts; end: DateParts; precision: "DAY" | "MONTH" | "YEAR" | "UNKNOWN" } {
  const text = value.replace(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/gi, "");
  return parseRange(text);
}

function exhibitionFact(input: CrawlInput, source: TrustedSource, fields: {
  title: string | null;
  dates: { start: DateParts; end: DateParts; precision: "DAY" | "MONTH" | "YEAR" | "UNKNOWN" };
  venue: string | null;
  city: string | null;
  roster: string[];
  extractionMethod: string;
}): CrawlFact {
  return finishFact(input, source, {
    title: fields.title,
    dates: fields.dates,
    venue: fields.venue,
    city: fields.city,
    country: null,
    participants: fields.roster.map((label) => participant(label, "EXPLICIT_PARTICIPANT", input.artists, "artist-roster")),
    extractionMethod: fields.extractionMethod,
  });
}

function noExhibitionFact(input: CrawlInput, source: TrustedSource, pageType: PageType): CrawlFact {
  const fact = heldFact(input, source, "NO_EXHIBITION_FACT", "NO_EXHIBITION_FACT", pageType);
  return { ...fact, confidence: "MEDIUM" };
}

function crawlTate(input: CrawlInput, source: TrustedSource): CrawlFact[] {
  const pageType = classifyFetchedPage(input.url, { html: input.html });
  if (pageType === "PRESS") return [heldFact(input, source, "PRESS_PAGE", "PRESS_PAGE", "PRESS")];
  if (pageType !== "EXHIBITION") return [noExhibitionFact(input, source, pageType)];
  const parsed = input.html ? tateExhibition(input.html) : null;
  if (!parsed?.title || !parsed.dateText) return [heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE", "EXHIBITION")];
  return [exhibitionFact(input, source, {
    title: parsed.title,
    dates: datedRange(parsed.dateText),
    venue: parsed.venue,
    city: parsed.city,
    roster: parsed.roster,
    extractionMethod: "TATE_EXHIBITION_ROSTER",
  })];
}

function crawlAic(input: CrawlInput, source: TrustedSource): CrawlFact[] {
  const pageType = classifyFetchedPage(input.url, { html: input.html, json: input.json });
  if (pageType !== "EXHIBITION") return [noExhibitionFact(input, source, pageType)];
  const parsed = aicExhibition(input.json);
  if (!parsed?.title || !parsed.startDate) return [heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE", "EXHIBITION")];
  const webSource = parsed.webUrl ? classifyTrustedUrl(parsed.webUrl) : null;
  const sourceUrl = webSource?.adapter === "aic-exhibition" ? parsed.webUrl ?? input.url : input.url;
  return [exhibitionFact({ ...input, url: sourceUrl }, source, {
    title: parsed.title,
    dates: datedRange([parsed.startDate, parsed.endDate].filter(Boolean).join(" – ")),
    venue: parsed.venue,
    city: parsed.city,
    roster: parsed.roster,
    extractionMethod: "AIC_EXHIBITION_API",
  })];
}

function crawlCleveland(input: CrawlInput, source: TrustedSource): CrawlFact[] {
  const pageType = classifyFetchedPage(input.url, { html: input.html, json: input.json });
  if (pageType === "PRESS") return [heldFact(input, source, "PRESS_PAGE", "PRESS_PAGE", "PRESS")];
  if (pageType !== "EXHIBITION") return [noExhibitionFact(input, source, pageType)];
  const apiRows = clevelandExhibitions(input.json);
  if (apiRows.length > 0) {
    return apiRows.map((parsed) => exhibitionFact(input, source, {
      title: parsed.title,
      dates: datedRange([parsed.startDate, parsed.endDate].filter(Boolean).join(" – ")),
      venue: parsed.venue,
      city: parsed.city,
      roster: [],
      extractionMethod: "CLEVELAND_EXHIBITION_API",
    }));
  }
  const htmlRow = input.html ? clevelandHtmlExhibition(input.html) : null;
  if (!htmlRow?.title || !htmlRow.dateText) return [heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE", "EXHIBITION")];
  return [exhibitionFact(input, source, {
    title: htmlRow.title,
    dates: datedRange(htmlRow.dateText),
    venue: htmlRow.venue,
    city: htmlRow.city,
    roster: [],
    extractionMethod: "CLEVELAND_EXHIBITION_PAGE",
  })];
}

function crawlMuseumApi(input: CrawlInput, source: TrustedSource): CrawlFact[] {
  const rows = museumRows(input.json);
  if (rows.length === 0) return [heldFact(input, source, "NO_STRUCTURE", "NO_STRUCTURE")];
  return rows.map((row) => {
    const dates = parseRange([row.startDate, row.endDate].filter((value) => typeof value === "string" && value.trim()).join(" – "));
    const artists = Array.isArray(row.artists) ? row.artists.filter((name): name is string => typeof name === "string" && name.trim().length > 0) : [];
    const recordUrl = typeof row.url === "string" && sameTrustedHost(row.url, input.url) ? row.url : input.url;
    return finishFact(
      { ...input, url: recordUrl },
      source,
      {
        title: typeof row.title === "string" ? row.title.trim() : null,
        dates,
        venue: typeof row.venue === "string" ? row.venue.trim() : null,
        city: typeof row.city === "string" ? row.city.trim() : null,
        country: typeof row.country === "string" ? row.country.trim() : null,
        participants: artists.map((label) => participant(label, "EXPLICIT_PARTICIPANT", input.artists, "api-artists")),
        extractionMethod: "MUSEUM_API_RECORD",
      },
    );
  });
}

type CrawlInput = {
  url: string;
  retrievedAt: string;
  html?: string;
  json?: unknown;
  text?: string;
  subjectLabel?: string | null;
  artists: { slug: string; labels: string[] }[];
  snapshot: GrowthSnapshot;
  snapshotReady?: boolean;
};

type Parsed = {
  title: string | null;
  dates: { start: DateParts; end: DateParts; precision: "DAY" | "MONTH" | "YEAR" | "UNKNOWN" };
  dateConflict?: boolean;
  venue: string | null;
  city: string | null;
  country: string | null;
  participants: CrawlParticipant[];
  curators?: CrawlCurator[];
  extractionMethod: string;
};

function finishFact(input: CrawlInput, source: TrustedSource, parsed: Parsed): CrawlFact {
  const title = parsed.title?.trim() || null;
  const sourceUrl = input.url;
  const field = title || parsed.dates.start.year || parsed.venue ? { sourceName: source.sourceName, sourceUrl } : null;
  const named = parsed.participants.length > 0 ? { sourceName: source.sourceName, sourceUrl } : null;
  const curators = parsed.curators ?? [];
  const curatorSource = curators.length > 0 ? { sourceName: source.sourceName, sourceUrl } : null;
  const candidate = factualCandidate(input, source, parsed);
  const preview = candidate ? previewCandidates([candidate], input.snapshot)[0] : null;
  const duplicate = preview?.decision ?? null;
  const existing = candidate
    ? input.snapshot.exhibitions.find((exhibition) => duplicateDecision(candidate, exhibition) === "EXACT") ?? null
    : null;
  const explicitExact = parsed.participants.filter((person) => person.evidence === "EXPLICIT_PARTICIPANT" && person.identity === "EXACT" && person.slug);
  const newSlugs = explicitExact.filter((person) => person.slug && !existing?.artistSlugs.includes(person.slug));
  const gate = decide({
    source,
    title,
    year: parsed.dates.start.year,
    venue: parsed.venue,
    city: parsed.city,
    country: parsed.country,
    participants: parsed.participants,
    dateConflict: parsed.dateConflict === true,
    duplicate,
    snapshotReady: input.snapshotReady !== false,
  });
  const alreadyRecorded = gate.decision === "AUTO_IMPORT" && duplicate === "EXACT" && newSlugs.length === 0;
  return {
    pilotRecordId: pilotRecordId(source.host, title, parsed.dates.start.year),
    title,
    startYear: parsed.dates.start.year,
    startMonth: parsed.dates.start.month,
    startDay: parsed.dates.start.day,
    endYear: parsed.dates.end.year,
    endMonth: parsed.dates.end.month,
    endDay: parsed.dates.end.day,
    datePrecision: parsed.dates.precision,
    venue: parsed.venue,
    city: parsed.city,
    country: parsed.country,
    participants: parsed.participants,
    curators,
    confidence: gate.confidence,
    decision: gate.decision,
    reason: gate.reason,
    duplicate,
    alreadyRecorded,
    graph: preview
      ? {
          newExhibition: preview.value.newExhibition,
          newArtistPairCount: preview.value.newArtistPairCount,
          chronologyValue: preview.value.chronologyValue,
        }
      : null,
    contentScope: "FACTUAL_METADATA_ONLY",
    provenance: {
      sourceName: source.sourceName,
      sourceUrl,
      retrievedAt: input.retrievedAt,
      sourceClass: source.sourceClass,
      sourceTier: source.sourceTier,
      extractionMethod: parsed.extractionMethod,
      titleSource: title ? field : null,
      dateSource: parsed.dates.start.year ? field : null,
      venueSource: parsed.venue ? field : null,
      citySource: parsed.city ? field : null,
      countrySource: parsed.country ? field : null,
      participantSource: named,
      curatorSource,
    },
    fieldProvenance: {
      title: title ? field : null,
      date: parsed.dates.start.year ? field : null,
      venue: parsed.venue ? field : null,
      city: parsed.city ? field : null,
      country: parsed.country ? field : null,
      participants: named,
      curators: curatorSource,
    },
    pageType: "EXHIBITION",
  };
}

function decide(input: {
  source: TrustedSource;
  title: string | null;
  year: number | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  participants: CrawlParticipant[];
  dateConflict: boolean;
  duplicate: DuplicateDecision | null;
  snapshotReady: boolean;
}): { confidence: CrawlConfidence; decision: CrawlDecision; reason: string } {
  if (!input.title) return { confidence: "LOW", decision: "HOLD", reason: "NO_STRUCTURE" };
  if (input.participants.some((person) => person.evidence === "TITLE_ONLY")) return { confidence: "LOW", decision: "HOLD", reason: "TITLE_ONLY" };
  if (input.participants.some((person) => person.evidence === "NOT_PARTICIPANT")) return { confidence: "LOW", decision: "HOLD", reason: "NOT_PARTICIPANT" };
  if (input.dateConflict) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "DATE_CONFLICT" };
  const explicitExact = input.participants.filter((person) => person.evidence === "EXPLICIT_PARTICIPANT" && person.identity === "EXACT" && person.slug);
  if (input.source.adapter === "foundation-cv" && explicitExact.length === 0) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "FOUNDATION_CV" };
  if (input.participants.some((person) => person.evidence === "AMBIGUOUS")) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "TITLE_HEADING" };
  if (input.participants.length === 0) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "NO_PARTICIPANT_LIST" };
  if (input.participants.some((person) => !mayCreateParticipation(person.evidence))) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "PARTICIPATION_REVIEW" };
  if (explicitExact.length === 0) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "IDENTITY_UNRESOLVED" };
  if (!input.year || !input.venue || !input.city || !input.country) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "INCOMPLETE_FACT" };
  if (spaceDecisionFor(input.venue) === "REVIEW") return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "SPACE_REVIEW" };
  if (input.duplicate === "REVIEW") return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "POSSIBLE_DUPLICATE" };
  if (!input.snapshotReady) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "SNAPSHOT_REQUIRED" };
  if (!input.source.autoImport) return { confidence: "MEDIUM", decision: "REVIEW_QUEUE", reason: "SOURCE_NOT_AUTO" };
  return { confidence: "HIGH", decision: "AUTO_IMPORT", reason: "HIGH_CONFIDENCE" };
}

function heldFact(input: CrawlInput, source: TrustedSource | null, reason: string, extractionMethod: string, pageType: PageType = "UNKNOWN"): CrawlFact {
  return {
    pilotRecordId: pilotRecordId(source?.host ?? "untrusted", null, null),
    title: null,
    startYear: null,
    startMonth: null,
    startDay: null,
    endYear: null,
    endMonth: null,
    endDay: null,
    datePrecision: "UNKNOWN",
    venue: null,
    city: null,
    country: null,
    participants: [],
    curators: [],
    confidence: "LOW",
    decision: "HOLD",
    reason,
    duplicate: null,
    alreadyRecorded: false,
    graph: null,
    contentScope: "FACTUAL_METADATA_ONLY",
    provenance: {
      sourceName: source?.sourceName ?? "Untrusted",
      sourceUrl: input.url,
      retrievedAt: input.retrievedAt,
      sourceClass: source?.sourceClass ?? "OTHER",
      sourceTier: source?.sourceTier ?? "LOW_AUTHORITY",
      extractionMethod,
      titleSource: null,
      dateSource: null,
      venueSource: null,
      citySource: null,
      countrySource: null,
      participantSource: null,
      curatorSource: null,
    },
    fieldProvenance: {
      title: null,
      date: null,
      venue: null,
      city: null,
      country: null,
      participants: null,
      curators: null,
    },
    pageType,
  };
}

export function unavailableFact(input: CrawlInput, reason = "SOURCE_UNAVAILABLE"): CrawlFact {
  const source = classifyTrustedUrl(input.url);
  const fact = heldFact(input, source, reason, reason);
  return { ...fact, decision: "SOURCE_UNAVAILABLE", confidence: "LOW" };
}

function factualCandidate(input: CrawlInput, source: TrustedSource, parsed: Parsed): FactualCandidate | null {
  if (!parsed.title || parsed.dates.start.year == null) return null;
  return {
    artistNames: parsed.participants.filter((person) => person.evidence === "EXPLICIT_PARTICIPANT").map((person) => person.label),
    title: parsed.title,
    startYear: parsed.dates.start.year,
    startMonth: parsed.dates.start.month,
    startDay: parsed.dates.start.day,
    endYear: parsed.dates.end.year,
    endMonth: parsed.dates.end.month,
    endDay: parsed.dates.end.day,
    datePrecision: parsed.dates.precision === "UNKNOWN" ? "YEAR" : parsed.dates.precision,
    space: parsed.venue,
    city: parsed.city,
    country: parsed.country,
    curatorNames: (parsed.curators ?? []).map((curator) => curator.rawName),
    sourceName: source.sourceName,
    sourceUrl: input.url,
    retrievedAt: input.retrievedAt,
    evidenceShort: parsed.title,
    externalIds: [],
    pilotRecordId: pilotRecordId(source.host, parsed.title, parsed.dates.start.year),
  };
}

function participant(label: string, evidence: ParticipantEvidence, artists: { slug: string; labels: string[] }[], evidenceLocation: string): CrawlParticipant {
  const slug = resolveArtistSlug(label, artists) ?? resolveVerifiedAlias(label);
  return { label, slug, evidence, identity: slug ? "EXACT" : "UNRESOLVED", evidenceLocation };
}

export function spaceDecisionFor(venue: string | null): SpaceDecision {
  if (!venue?.trim()) return "MISSING";
  if (resolveVerifiedSpace(venue)) return "RESOLVED";
  const key = normalizeArtistLookup(venue);
  for (const space of VERIFIED_SPACES) {
    for (const alias of space.aliases) {
      const aliasKey = normalizeArtistLookup(alias);
      if (aliasKey.length < 4) continue;
      if (key.includes(aliasKey) && key !== aliasKey) return "REVIEW";
    }
  }
  return "NEW";
}

function edgeLabels(fact: CrawlFact): CrawlParticipant[] {
  return fact.participants.filter((person) => mayCreateParticipation(person.evidence) && person.identity === "EXACT" && person.slug);
}

function artistPlan(slug: string, facts: CrawlFact[]): TrustedImportBatch["artists"][number] | null {
  const person = facts.flatMap((fact) => fact.participants).find((item) => item.slug === slug);
  if (!person) return null;
  const latin = VERIFIED_ALIASES.find((alias) => alias.slug === slug && alias.script === "Latn");
  const hangul = VERIFIED_ALIASES.find((alias) => alias.slug === slug && alias.script === "Hang");
  const page = facts.find((fact) => fact.participants.some((item) => item.slug === slug));
  return {
    slug,
    canonicalName: latin?.label ?? person.label,
    nativeName: hangul?.label ?? null,
    birthYear: null,
    country: null,
    officialWebsite: page?.provenance.sourceUrl ?? null,
  };
}

function evidenceLine(fact: CrawlFact): string {
  const people = edgeLabels(fact).map((person) => person.label).join(", ");
  const when = [formatPoint({ year: fact.startYear, month: fact.startMonth, day: fact.startDay }), formatPoint({ year: fact.endYear, month: fact.endMonth, day: fact.endDay })]
    .filter(Boolean)
    .join(" – ");
  return `${fact.provenance.sourceName}: ${[people, fact.title, when, fact.venue, fact.city].filter(Boolean).join(", ")}.`.slice(0, 240);
}

function pilotRecordId(host: string, title: string | null, year: number | null): string {
  const slug = `${host.split(".")[0]}-${normalizeFactTitle(title ?? "fact")}-${year ?? "undated"}`
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug.slice(0, 96) || "trusted-fact";
}

function isNameListTitle(title: string): boolean {
  return title.split(",").map((part) => part.trim()).filter(Boolean).length >= 3;
}

function kukjeCity(area: string, html = ""): string | null {
  const first = area.split(/\s+/).find(Boolean) ?? "";
  if (first === "Seoul" || first === "Busan") return first;
  if (/site-location__item--seoul\s+site-location__item--active/.test(html)) return "Seoul";
  if (/site-location__item--busan\s+site-location__item--active/.test(html)) return "Busan";
  return null;
}

function sameTrustedHost(left: string, right: string): boolean {
  const a = classifyTrustedUrl(left);
  const b = classifyTrustedUrl(right);
  return Boolean(a && b && a.host === b.host);
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#8211;|&#x2013;|&ndash;/g, "–")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/\s+/g, " ")
    .trim();
}

function elementTexts(html: string, classToken: string): string[] {
  const token = classToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<([a-zA-Z0-9]+)\\b[^>]*\\bclass="[^"]*\\b${token}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, "gi");
  const found: string[] = [];
  for (const match of html.matchAll(re)) {
    const text = decode(match[2] ?? "");
    if (text) found.push(text);
  }
  return found;
}

function block(html: string, classToken: string): string | null {
  const token = classToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<([a-zA-Z0-9]+)\\b[^>]*\\bclass="[^"]*\\b${token}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, "i");
  return re.exec(html)?.[2] ?? null;
}

function paragraphTexts(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = decode(match[1] ?? "");
    if (text) found.push(text);
  }
  return found;
}

function datedCvLines(source: string): string[] {
  const text = source
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|tr|h\d)>/gi, "\n");
  return text
    .split(/\r?\n/)
    .map((line) => decode(line))
    .filter((line) => /^(19|20)\d{2}\b/.test(line) && line.length > 4 && line.length <= 180 && !awardOnly(line));
}

function awardOnly(line: string): boolean {
  const body = line.slice(4);
  const award = /상|훈장|prize|award/i.test(body);
  const exhibition = /exhibition|gallery|museum|미술관|갤러리|화랑|biennale|비엔날레|,/i.test(body);
  return award && !exhibition;
}

function explicitCvArtists(line: string): string[] {
  const match = /(?:^|\s)artists:\s*([^|]+)/i.exec(line);
  if (!match?.[1]) return [];
  return splitArtistField(match[1]);
}

function headingTitle(html: string): string | null {
  const match = /<h3\b[^>]*\bclass="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/h3>/i.exec(html);
  const text = match ? decode(match[1] ?? "") : "";
  return text || null;
}

function documentTitle(html: string): string {
  const match = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return match ? decode(match[1] ?? "") : "";
}

function definitionFields(html: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const match of html.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)) {
    const key = decode(match[1] ?? "").toLowerCase();
    const value = decode(match[2] ?? "");
    if (key && value && !fields.has(key)) fields.set(key, value);
  }
  return fields;
}

function firstBarDate(html: string): string | null {
  const match = /<ul class="barList">\s*<li>([\s\S]*?)<\/li>/i.exec(html);
  const text = match ? decode(match[1] ?? "") : "";
  return text || null;
}

function splitArtistField(value: string): string[] {
  const text = value.trim();
  if (!text) return [];
  if (text.includes("/") || text.includes(";") || /\band\b/i.test(text)) {
    return text.split(/\s*(?:\/|;|\band\b)\s+/i).map((part) => part.trim()).filter((part) => part.length > 1);
  }
  const comma = text.split(",").map((part) => part.trim()).filter(Boolean);
  const commaSafe = comma.length >= 2 && comma.every((part) => part.split(/\s+/).length >= 2 || /[가-힣]{2,}/.test(part));
  return commaSafe ? comma : [text];
}

function namedPlace(text: string, names: readonly string[]): string | null {
  const padded = ` ${normalizeArtistLookup(text)} `;
  for (const name of names) {
    if (padded.includes(` ${normalizeArtistLookup(name)} `)) return name;
  }
  return null;
}

function explicitSpaceAlias(text: string): string | null {
  const padded = ` ${normalizeArtistLookup(text)} `;
  let found: string | null = null;
  for (const space of VERIFIED_SPACES) {
    for (const alias of space.aliases) {
      const aliasKey = normalizeArtistLookup(alias);
      if (!aliasKey || !padded.includes(` ${aliasKey} `)) continue;
      if (found && normalizeArtistLookup(found) !== aliasKey) return null;
      found = alias;
    }
  }
  return found;
}

function rangesConflict(
  left: { start: DateParts; end: DateParts },
  right: { start: DateParts; end: DateParts },
): boolean {
  if (!left.start.year || !right.start.year) return false;
  return pointsConflict(left.start, right.start) || pointsConflict(left.end, right.end);
}

function pointsConflict(left: DateParts, right: DateParts): boolean {
  if (left.year && right.year && left.year !== right.year) return true;
  if (left.month && right.month && left.month !== right.month) return true;
  if (left.day && right.day && left.day !== right.day) return true;
  return false;
}

export type TrustedFetchResult = {
  html?: string;
  json?: unknown;
  blocked?: string;
  requests: number;
  host: string;
};

export async function fetchTrustedDocument(
  url: string,
  state: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    cache?: Map<string, TrustedFetchResult>;
    lastByHost?: Map<string, number>;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  } = {},
): Promise<TrustedFetchResult> {
  const source = classifyTrustedUrl(url);
  const host = source?.host ?? "untrusted";
  if (!source) return { blocked: "LOW_AUTHORITY", requests: 0, host };
  const cached = state.cache?.get(url);
  if (cached) return { ...cached, requests: 0 };
  const fetchImpl = state.fetchImpl ?? fetch;
  const sleep = state.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = state.now ?? Date.now;
  const previous = state.lastByHost?.get(host) ?? 0;
  const wait = previous > 0 ? Math.max(0, CRAWL_LIMITS.domainIntervalMs - (now() - previous)) : 0;
  if (wait > 0) await sleep(wait);
  let requests = 0;
  let blocked = "SOURCE_UNAVAILABLE";
  let html: string | undefined;
  let json: unknown;
  for (let attempt = 1; attempt <= CRAWL_LIMITS.maxAttempts; attempt += 1) {
    requests += 1;
    state.lastByHost?.set(host, now());
    try {
      const response = await fetchImpl(url, {
        headers: { "user-agent": CRAWL_LIMITS.userAgent, accept: "text/html,application/json" },
        redirect: "follow",
        signal: AbortSignal.timeout(state.timeoutMs ?? CRAWL_LIMITS.timeoutMs),
      });
      if (response.status === 429 || response.status >= 500) {
        if (attempt < CRAWL_LIMITS.maxAttempts) {
          await sleep(400 * attempt);
          continue;
        }
        break;
      }
      if (!response.ok) break;
      const landed = classifyTrustedUrl(response.url || url);
      if (!landed || landed.host !== source.host) {
        blocked = "REDIRECTED_OFF_HOST";
        break;
      }
      const text = await response.text();
      if (text.length > CRAWL_LIMITS.maxBytes) {
        blocked = "PAGE_TOO_LARGE";
        break;
      }
      const type = response.headers.get("content-type") ?? "";
      if (type.includes("json")) {
        try {
          json = JSON.parse(text) as unknown;
          blocked = "";
        } catch {
          blocked = "NO_STRUCTURE";
        }
        break;
      }
      html = text;
      blocked = "";
      break;
    } catch {
      if (attempt < CRAWL_LIMITS.maxAttempts) {
        await sleep(400 * attempt);
        continue;
      }
    }
  }
  const result: TrustedFetchResult = {
    requests,
    host,
    ...(html ? { html } : {}),
    ...(json !== undefined ? { json } : {}),
    ...(blocked ? { blocked } : {}),
  };
  state.cache?.set(url, result);
  return result;
}

function parsePoint(input: string): DateParts {
  const text = input.trim();
  let match = text.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s*(\d{4})?$/);
  if (match && MONTHS[match[1].toLowerCase()]) {
    return { month: MONTHS[match[1].toLowerCase()], day: Number(match[2]), year: match[3] ? Number(match[3]) : null };
  }
  match = text.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?\s*(\d{4})?$/);
  if (match && MONTHS[match[2].toLowerCase()]) {
    return { day: Number(match[1]), month: MONTHS[match[2].toLowerCase()], year: match[3] ? Number(match[3]) : null };
  }
  match = text.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (match && MONTHS[match[1].toLowerCase()]) {
    return { month: MONTHS[match[1].toLowerCase()], day: null, year: Number(match[2]) };
  }
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  match = text.match(/^(\d{4})$/);
  if (match) return { year: Number(match[1]), month: null, day: null };
  return { year: null, month: null, day: null };
}

function parseRange(input: string): { start: DateParts; end: DateParts; precision: "DAY" | "MONTH" | "YEAR" | "UNKNOWN" } {
  const text = decode(input);
  const parts = text.split(/\s*[~～]\s*|\s+[–—-]\s+|\s+to\s+/i).map((part) => part.trim()).filter(Boolean);
  const empty = { year: null, month: null, day: null };
  if (parts.length === 0) return { start: empty, end: empty, precision: "UNKNOWN" };
  const start = parsePoint(parts[0] ?? "");
  const end = parts.length > 1 ? parsePoint(parts[1] ?? "") : { ...start, month: start.month, day: start.day };
  if (start.year == null) start.year = end.year;
  if (end.year == null) end.year = start.year;
  const precision = start.day && end.day ? "DAY" : start.month && end.month ? "MONTH" : start.year ? "YEAR" : "UNKNOWN";
  return { start, end, precision };
}

function formatPoint(value: DateParts): string {
  const month = value.month ? MONTH_NAMES[value.month] ?? "" : "";
  if (value.day && month && value.year) return `${value.day} ${month} ${value.year}`;
  if (month && value.year) return `${month} ${value.year}`;
  return value.year ? String(value.year) : "";
}

function museumRows(json: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(json) ? json : isRecord(json) && Array.isArray(json.exhibitions) ? json.exhibitions : [];
  return rows.filter(isRecord);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
