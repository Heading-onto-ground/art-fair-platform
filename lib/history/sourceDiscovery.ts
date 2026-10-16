import { VERIFIED_ALIASES, aliasLookupEqual, mayCreateParticipation, normalizeArtistLookup } from "@/lib/history/identity";
import { classifyTrustedUrl, type CrawlFact, type SourceTier } from "@/lib/history/trustedCrawl";

export const DISCOVERED_TRUSTED_SOURCE_CANDIDATES = "DISCOVERED_TRUSTED_SOURCE_CANDIDATES";

export const CONTROL_ARTISTS = [
  "park-seo-bo",
  "lee-ufan",
  "ha-chong-hyun",
  "yun-hyong-keun",
  "lee-seung-jio",
] as const;

export type DiscoverySourceType =
  | "ARTIST_OFFICIAL"
  | "FOUNDATION"
  | "REPRESENTING_GALLERY"
  | "MUSEUM"
  | "GOVERNMENT_CULTURAL"
  | "ACADEMY_ARCHIVE"
  | "UNKNOWN";

export type DiscoveryCandidate = {
  artistId: string;
  canonicalArtistName: string;
  sourceName: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceType: Exclude<DiscoverySourceType, "UNKNOWN">;
  sourceTier: SourceTier;
  discoveryMethod: "WIKIDATA_OFFICIAL" | "WIKIDATA_INSTITUTION" | "SEARCH_HIT";
  identityMatch: "EXACT_ALIAS";
  confidence: "HIGH" | "MEDIUM";
  discoveryReason: string;
};

export type DiscoveryEntity = {
  id: string;
  label: string;
  description: string;
  aliases: string[];
  instanceOf: string[];
  occupations: string[];
  officialWebsites: string[];
  collectionIds: string[];
};

export type DiscoveryInstitution = {
  id: string;
  label: string;
  description: string;
  instanceOf: string[];
  officialWebsites: string[];
};

export type SearchHit = {
  title: string;
  url: string;
};

const HUMAN = "Q5";
const ARTIST_OCCUPATIONS = new Set(["Q1028181", "Q1281618", "Q3391743", "Q483501"]);
const HARD_BLOCKED_OCCUPATIONS = new Set(["Q2405480", "Q33999", "Q82955", "Q43229"]);
export const VOICE_ACTOR_ENTITY_ID = "Q12612046";

const BLOCKED_HOSTS = {
  search: ["google.com", "google.co.kr", "bing.com", "duckduckgo.com", "search.naver.com", "search.yahoo.com", "wikipedia.org", "wikidata.org"],
  social: ["instagram.com", "facebook.com", "twitter.com", "x.com", "youtube.com", "tiktok.com", "pinterest.com", "threads.net", "weibo.com"],
  market: ["artsy.net", "artnet.com", "saatchiart.com", "ebay.com", "mutualart.com", "artprice.com", "sothebys.com", "christies.com", "invaluable.com"],
  press: ["nytimes.com", "theguardian.com", "chosun.com", "donga.com", "joongang.co.kr", "khan.co.kr", "huffpost.com", "bbc.com", "bbc.co.uk", "reuters.com", "yna.co.kr", "namu.wiki"],
} as const;

export function aliasesFor(slug: string): string[] {
  return VERIFIED_ALIASES.filter((alias) => alias.slug === slug).map((alias) => alias.label);
}

export function canonicalArtistName(slug: string): string {
  const aliases = VERIFIED_ALIASES.filter((alias) => alias.slug === slug);
  return aliases.find((alias) => alias.script === "Latn")?.label ?? aliases[0]?.label ?? slug;
}

export function canonicalDiscoveryUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const kept = [...url.searchParams.entries()].filter(([key]) => !key.toLowerCase().startsWith("utm_"));
  url.search = "";
  for (const [key, item] of kept) url.searchParams.append(key, item);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const query = url.searchParams.toString();
  return `https://${host}${path === "/" ? "" : path}${query ? `?${query}` : ""}`;
}

export function discoveryDomain(value: string): string | null {
  const canonical = canonicalDiscoveryUrl(value);
  if (!canonical) return null;
  return new URL(canonical).hostname;
}

function hostBlocked(hostname: string, group: keyof typeof BLOCKED_HOSTS): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return BLOCKED_HOSTS[group].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

function rejectionForHost(hostname: string): string | null {
  if (hostBlocked(hostname, "search")) return "SEARCH_OR_REFERENCE_PAGE";
  if (hostBlocked(hostname, "social")) return "SOCIAL";
  if (hostBlocked(hostname, "market")) return "MARKET";
  if (hostBlocked(hostname, "press")) return "PRESS";
  return null;
}

function exactAlias(label: string, slug: string): boolean {
  return aliasesFor(slug).some((alias) => aliasLookupEqual(alias, label));
}

function titleHasExactAlias(title: string, slug: string): boolean {
  const folded = ` ${normalizeArtistLookup(title)} `;
  return aliasesFor(slug).some((alias) => {
    const name = normalizeArtistLookup(alias);
    return name.length > 0 && folded.includes(` ${name} `);
  });
}

function isHumanArtist(entity: DiscoveryEntity): boolean {
  if (!entity.instanceOf.includes(HUMAN)) return false;
  if (blockedContext(entity)) return false;
  if (entity.occupations.some((occupation) => HARD_BLOCKED_OCCUPATIONS.has(occupation))) return false;
  return entity.occupations.some((occupation) => ARTIST_OCCUPATIONS.has(occupation));
}

function blockedContext(entity: DiscoveryEntity): boolean {
  const text = `${entity.description}`.toLowerCase();
  return /voice actor|disambiguation|encyclopedia article|newspaper|organization/.test(text);
}

function nativeLabel(label: string): string | null {
  const match = label.match(/^(.*?)\s*[（(][^)）]+[)）]\s*$/);
  const native = match?.[1]?.trim() ?? "";
  return native || null;
}

function relatesToSlug(entity: DiscoveryEntity, slug: string): boolean {
  if ([entity.label, ...entity.aliases].some((label) => exactAlias(label, slug))) return true;
  const native = nativeLabel(entity.label);
  return Boolean(native && exactAlias(native, slug));
}

function identityBasisFor(entity: DiscoveryEntity, slug: string): "EXACT_ALIAS" | "STRUCTURED_NATIVE_LABEL" {
  if ([entity.label, ...entity.aliases].some((label) => exactAlias(label, slug))) return "EXACT_ALIAS";
  return "STRUCTURED_NATIVE_LABEL";
}

export function selectDiscoveryEntity(entities: readonly DiscoveryEntity[], slug: string): {
  selected: DiscoveryEntity | null;
  rejectedEntityIds: string[];
  identityBasis: "EXACT_ALIAS" | "STRUCTURED_NATIVE_LABEL" | null;
} {
  const named = entities.filter((entity) => relatesToSlug(entity, slug));
  const eligible = named.filter((entity) => isHumanArtist(entity) && !blockedContext(entity));
  if (eligible.length !== 1) {
    return { selected: null, rejectedEntityIds: named.map((entity) => entity.id), identityBasis: null };
  }
  const selected = eligible[0] ?? null;
  return {
    selected,
    rejectedEntityIds: named.filter((entity) => entity.id !== selected?.id).map((entity) => entity.id),
    identityBasis: selected ? identityBasisFor(selected, slug) : null,
  };
}

function sourceTypeForHost(url: string): Exclude<DiscoverySourceType, "UNKNOWN"> | null {
  const known = classifyTrustedUrl(url);
  if (!known) return null;
  if (known.host === "naa.go.kr") return "ACADEMY_ARCHIVE";
  if (known.host === "mmca.go.kr") return "GOVERNMENT_CULTURAL";
  if (known.adapter === "museum-api" || known.sourceClass === "MUSEUM") return "MUSEUM";
  if (known.sourceTier === "OFFICIAL_GALLERY") return "REPRESENTING_GALLERY";
  return null;
}

function tierFor(url: string, sourceType: Exclude<DiscoverySourceType, "UNKNOWN">): SourceTier {
  return classifyTrustedUrl(url)?.sourceTier
    ?? (sourceType === "REPRESENTING_GALLERY" ? "OFFICIAL_GALLERY"
      : sourceType === "MUSEUM" || sourceType === "GOVERNMENT_CULTURAL" ? "MUSEUM"
        : "FIRST_PARTY");
}

function websiteKind(url: string): Exclude<DiscoverySourceType, "UNKNOWN"> | null {
  const domain = discoveryDomain(url);
  if (!domain || rejectionForHost(domain)) return null;
  const known = sourceTypeForHost(url);
  if (known) return known;
  if (/foundation|refoundation|fondation/i.test(domain)) return "FOUNDATION";
  return "ARTIST_OFFICIAL";
}

function institutionKind(institution: DiscoveryInstitution): Exclude<DiscoverySourceType, "UNKNOWN"> | null {
  const text = `${institution.label} ${institution.description}`.toLowerCase();
  if (/university|college/.test(text) && !/museum/.test(text)) return null;
  if (/newspaper|encyclopedia article|voice actor|singer/.test(text)) return null;
  if (/jewellery collection|jewelry collection/.test(text)) return null;
  if (/academy|archive/.test(text)) return "ACADEMY_ARCHIVE";
  if (/foundation/.test(text) && !/museum/.test(text)) return "FOUNDATION";
  if (/gallery/.test(text) && !/museum/.test(text)) return "REPRESENTING_GALLERY";
  if (/museum|art institution/.test(text)) return "MUSEUM";
  return null;
}

function candidate(input: {
  slug: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: Exclude<DiscoverySourceType, "UNKNOWN">;
  discoveryMethod: DiscoveryCandidate["discoveryMethod"];
  confidence: DiscoveryCandidate["confidence"];
  discoveryReason: string;
}): DiscoveryCandidate | null {
  const sourceUrl = canonicalDiscoveryUrl(input.sourceUrl);
  const sourceDomain = sourceUrl ? discoveryDomain(sourceUrl) : null;
  if (!sourceUrl || !sourceDomain || rejectionForHost(sourceDomain)) return null;
  return {
    artistId: input.slug,
    canonicalArtistName: canonicalArtistName(input.slug),
    sourceName: input.sourceName.trim() || sourceDomain,
    sourceUrl,
    sourceDomain,
    sourceType: input.sourceType,
    sourceTier: tierFor(sourceUrl, input.sourceType),
    discoveryMethod: input.discoveryMethod,
    identityMatch: "EXACT_ALIAS",
    confidence: input.confidence,
    discoveryReason: input.discoveryReason,
  };
}

const TYPE_RANK: Record<DiscoveryCandidate["sourceType"], number> = {
  ARTIST_OFFICIAL: 0,
  FOUNDATION: 1,
  REPRESENTING_GALLERY: 2,
  MUSEUM: 3,
  GOVERNMENT_CULTURAL: 4,
  ACADEMY_ARCHIVE: 5,
};

export function dedupeDiscoveryCandidates(candidates: readonly DiscoveryCandidate[]): DiscoveryCandidate[] {
  const ranked = [...candidates].sort((left, right) => {
    const type = TYPE_RANK[left.sourceType] - TYPE_RANK[right.sourceType];
    if (type !== 0) return type;
    if (left.confidence !== right.confidence) return left.confidence === "HIGH" ? -1 : 1;
    return left.sourceUrl.length - right.sourceUrl.length;
  });
  const seen = new Set<string>();
  const kept: DiscoveryCandidate[] = [];
  for (const item of ranked) {
    const key = `${item.artistId}|${item.sourceDomain}`;
    if (seen.has(key) || seen.has(item.sourceUrl)) continue;
    seen.add(key);
    seen.add(item.sourceUrl);
    kept.push(item);
  }
  return kept;
}

export function classifySearchHit(hit: SearchHit, slug: string): DiscoveryCandidate | null {
  const domain = discoveryDomain(hit.url);
  if (!domain) return null;
  if (rejectionForHost(domain)) return null;
  const sourceType = sourceTypeForHost(hit.url);
  if (!sourceType) return null;
  if (!titleHasExactAlias(hit.title, slug)) return null;
  let path = "";
  try {
    path = new URL(hit.url).pathname.toLowerCase();
  } catch {
    return null;
  }
  if (path.includes("/news/") || path.includes("/press")) return null;
  return candidate({
    slug,
    sourceName: classifyTrustedUrl(hit.url)?.sourceName ?? domain,
    sourceUrl: hit.url,
    sourceType,
    discoveryMethod: "SEARCH_HIT",
    confidence: "MEDIUM",
    discoveryReason: "HOST_CLASS_AND_EXACT_ALIAS",
  });
}

export function discoverTrustedSources(input: {
  artistId: string;
  entities: readonly DiscoveryEntity[];
  institutions: readonly DiscoveryInstitution[];
  searchHits?: readonly SearchHit[];
}): {
  resolvedEntityId: string | null;
  rejectedEntityIds: string[];
  identityBasis: "EXACT_ALIAS" | "STRUCTURED_NATIVE_LABEL" | null;
  candidates: DiscoveryCandidate[];
} {
  const choice = selectDiscoveryEntity(input.entities, input.artistId);
  const found: DiscoveryCandidate[] = [];
  if (choice.selected) {
    for (const url of choice.selected.officialWebsites) {
      const sourceType = websiteKind(url);
      if (!sourceType) continue;
      const next = candidate({
        slug: input.artistId,
        sourceName: canonicalArtistName(input.artistId),
        sourceUrl: url,
        sourceType,
        discoveryMethod: "WIKIDATA_OFFICIAL",
        confidence: "HIGH",
        discoveryReason: "EXACT_ALIAS_AND_OFFICIAL_SITE",
      });
      if (next) found.push(next);
    }
    const institutions = new Map(input.institutions.map((institution) => [institution.id, institution]));
    for (const id of choice.selected.collectionIds) {
      const institution = institutions.get(id);
      if (!institution) continue;
      const sourceType = institutionKind(institution);
      if (!sourceType) continue;
      const websites = institution.officialWebsites
        .map((url) => canonicalDiscoveryUrl(url))
        .filter((url): url is string => Boolean(url));
      const preferred = websites.find((url) => url.startsWith("https://")) ?? websites[0];
      if (!preferred) continue;
      const next = candidate({
        slug: input.artistId,
        sourceName: institution.label || discoveryDomain(preferred) || institution.id,
        sourceUrl: preferred,
        sourceType,
        discoveryMethod: "WIKIDATA_INSTITUTION",
        confidence: "HIGH",
        discoveryReason: "EXACT_ALIAS_AND_INSTITUTION_SITE",
      });
      if (next) found.push(next);
    }
  }
  for (const hit of input.searchHits ?? []) {
    const next = classifySearchHit(hit, input.artistId);
    if (next) found.push(next);
  }
  return {
    resolvedEntityId: choice.selected?.id ?? null,
    rejectedEntityIds: choice.rejectedEntityIds,
    identityBasis: choice.identityBasis,
    candidates: dedupeDiscoveryCandidates(found),
  };
}

export const NEW_INSTITUTION_ADAPTERS = ["tate-exhibition", "aic-exhibition", "cleveland-exhibition"] as const;

export function sourceDiscoveryAcceptance(input: {
  wrongPersonLinks: number;
  searchResultProvenance: number;
  resolvedVoiceActor: boolean;
  facts: readonly {
    adapter: string;
    pageType: string;
    title: string | null;
    decision: string;
    duplicate: string | null;
    reason: string;
  }[];
}): "ROB_SOURCE_DISCOVERY_V1_ACCEPTED" | "ROB_SOURCE_DISCOVERY_ADAPTERS_TOO_THIN" | "ROB_SOURCE_DISCOVERY_IDENTITY_BLOCKED" {
  if (input.wrongPersonLinks > 0 || input.resolvedVoiceActor || input.searchResultProvenance > 0) {
    return "ROB_SOURCE_DISCOVERY_IDENTITY_BLOCKED";
  }
  const factual = input.facts.filter((fact) => (
    NEW_INSTITUTION_ADAPTERS.some((adapter) => adapter === fact.adapter)
    && fact.pageType === "EXHIBITION"
    && Boolean(fact.title)
    && fact.reason !== "NO_STRUCTURE"
    && fact.reason !== "NO_EXHIBITION_FACT"
    && fact.decision !== "SOURCE_UNAVAILABLE"
  ));
  const adapters = new Set(factual.map((fact) => fact.adapter));
  const eligibleNew = factual.some((fact) => fact.decision === "AUTO_IMPORT" && fact.duplicate === "NEW");
  const exact = input.facts.some((fact) => fact.duplicate === "EXACT");
  if (adapters.size >= 2 && eligibleNew && exact) return "ROB_SOURCE_DISCOVERY_V1_ACCEPTED";
  return "ROB_SOURCE_DISCOVERY_ADAPTERS_TOO_THIN";
}

export function summarizeCrawlerDryRun(facts: readonly Pick<CrawlFact, "title" | "decision" | "participants">[]): {
  extractableFactCount: number;
  explicitParticipationCount: number;
  reviewCount: number;
} {
  const extractable = facts.filter((fact) => fact.title && fact.decision !== "HOLD" && fact.decision !== "SOURCE_UNAVAILABLE");
  return {
    extractableFactCount: extractable.length,
    explicitParticipationCount: extractable.reduce((sum, fact) => sum + fact.participants.filter((person) => mayCreateParticipation(person.evidence) && person.identity === "EXACT").length, 0),
    reviewCount: facts.filter((fact) => fact.decision === "REVIEW_QUEUE").length,
  };
}

export function crawlerCanFetch(url: string): boolean {
  return classifyTrustedUrl(url) !== null;
}

export function discoveryReadiness(artists: readonly { artistId: string; candidates: readonly DiscoveryCandidate[]; wrongPersonLinks: number }[]): {
  artistsWithTrustedCandidate: number;
  wrongPersonLinks: number;
  searchResultProvenance: number;
  decision: "ROB_SOURCE_DISCOVERY_V1_READY" | "WRONG_PERSON_LINK" | "SEARCH_RESULT_PROVENANCE" | "INSUFFICIENT_CANDIDATES";
} {
  const artistsWithTrustedCandidate = artists.filter((artist) => artist.candidates.length > 0).length;
  const wrongPersonLinks = artists.reduce((sum, artist) => sum + artist.wrongPersonLinks, 0);
  const searchResultProvenance = artists.reduce((sum, artist) => sum + artist.candidates.filter((item) => {
    const domain = discoveryDomain(item.sourceUrl);
    return domain ? hostBlocked(domain, "search") : false;
  }).length, 0);
  const decision = wrongPersonLinks > 0
    ? "WRONG_PERSON_LINK"
    : searchResultProvenance > 0
      ? "SEARCH_RESULT_PROVENANCE"
      : artistsWithTrustedCandidate >= 4
        ? "ROB_SOURCE_DISCOVERY_V1_READY"
        : "INSUFFICIENT_CANDIDATES";
  return { artistsWithTrustedCandidate, wrongPersonLinks, searchResultProvenance, decision };
}
