import { aliasLookupEqual, normalizeArtistLookup, resolveArtistSlug } from "@/lib/history/identity";
import { classifyTrustedUrl } from "@/lib/history/trustedCrawl";

/**
 * Artist-list discovery for galleries ROB already trusts.
 * A roster row is a research candidate, not an exhibition, a participation,
 * or an ArtistEntity. Exhibition parsers stay on their own adapters.
 */

export type RosterAdapter = "kukje-roster" | "hyundai-roster" | "arario-roster";

export type RosterQualifier = "ESTATE" | "COLLECTIVE_CANDIDATE" | "UNKNOWN_ENTITY_TYPE";

export type TrustedArtistRoster = {
  host: string;
  indexUrl: string;
  sourceName: string;
  adapter: RosterAdapter;
  enabled: boolean;
};

export const TRUSTED_ARTIST_ROSTERS: readonly TrustedArtistRoster[] = [
  {
    host: "kukjegallery.com",
    indexUrl: "https://www.kukjegallery.com/artists",
    sourceName: "Kukje Gallery",
    adapter: "kukje-roster",
    enabled: true,
  },
  {
    host: "galleryhyundai.com",
    indexUrl: "https://www.galleryhyundai.com/artist/list",
    sourceName: "Gallery Hyundai",
    adapter: "hyundai-roster",
    enabled: true,
  },
  {
    host: "arariogallery.com",
    indexUrl: "https://www.arariogallery.com/artists/",
    sourceName: "Arario Gallery",
    adapter: "arario-roster",
    enabled: true,
  },
];

/** Previous roster list shape. Enabled artist rosters, not a second trust list. */
export const TRUSTED_GALLERY_ROSTERS = TRUSTED_ARTIST_ROSTERS
  .filter((roster) => roster.enabled)
  .map((roster) => ({ indexUrl: roster.indexUrl, sourceName: roster.sourceName }));

export type ArtistRosterEntry = {
  displayName: string;
  nativeNameCandidate: string | null;
  profileUrl: string | null;
  indexUrl: string;
  sourceName: string;
  sourceHost: string;
  sourceType: "GALLERY_ROSTER";
  rosterQualifier: RosterQualifier | null;
  adapter: RosterAdapter;
  rawLabel: string;
};

export type ClassifiedRoster = {
  existing: { entry: ArtistRosterEntry; artistSlug: string }[];
  candidates: ArtistRosterEntry[];
  review: ArtistRosterEntry[];
  missingProfile: ArtistRosterEntry[];
};

const ROSTER_STREAM: Record<RosterAdapter, string> = {
  "kukje-roster": "KUKJE_ROSTER",
  "hyundai-roster": "HYUNDAI_ROSTER",
  "arario-roster": "ARARIO_ROSTER",
};

export function rosterStreamName(adapter: RosterAdapter): string {
  return ROSTER_STREAM[adapter];
}

export function rosterByIndex(indexUrl: string): TrustedArtistRoster | null {
  const key = canonicalRosterUrl(indexUrl);
  return TRUSTED_ARTIST_ROSTERS.find((roster) => canonicalRosterUrl(roster.indexUrl) === key) ?? null;
}

export function parseArtistRoster(html: string, roster: TrustedArtistRoster): ArtistRosterEntry[] {
  const entries = roster.adapter === "kukje-roster"
    ? parseKukjeRoster(html, roster)
    : roster.adapter === "hyundai-roster"
      ? parseHyundaiRoster(html, roster)
      : parseArarioRoster(html, roster);
  return markDuplicateLabels(entries);
}

export function matchArtistRoster(
  html: string,
  labels: readonly string[],
  indexUrl: string,
): { url: string; sourceName: string } | null {
  const roster = rosterByIndex(indexUrl);
  if (!roster || labels.length === 0) return null;
  const matched = new Set<string>();
  for (const entry of parseArtistRoster(html, roster)) {
    if (!entry.profileUrl) continue;
    const names = [entry.displayName, entry.nativeNameCandidate].filter((name): name is string => Boolean(name));
    if (!names.some((name) => labels.some((label) => aliasLookupEqual(name, label)))) continue;
    matched.add(entry.profileUrl);
  }
  if (matched.size !== 1) return null;
  const url = [...matched][0];
  return url ? { url, sourceName: roster.sourceName } : null;
}

/** Same contract as the earlier Kukje helper. Dispatch is adapter configuration. */
export function matchTrustedGalleryRoster(
  html: string,
  labels: readonly string[],
  indexUrl: string,
): { url: string; sourceName: string } | null {
  return matchArtistRoster(html, labels, indexUrl);
}

export function isTrustedArtistProfileUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const roster = TRUSTED_ARTIST_ROSTERS.find((item) => item.enabled && item.host === host);
  if (!roster || !classifyTrustedUrl(url)) return false;
  return profilePathAllowed(roster.adapter, `${parsed.pathname}${parsed.search}`);
}

/**
 * Splits a parsed roster into existing artists, new person-like candidates,
 * and rows that need entity review. Estate is not rewritten into a person name.
 * Collective labels are not split into people.
 */
export function classifyRosterEntries(
  entries: readonly ArtistRosterEntry[],
  names: readonly { slug: string; labels: string[] }[],
): ClassifiedRoster {
  const known = names.map((artist) => ({ slug: artist.slug, labels: [...artist.labels] }));
  const existing: ClassifiedRoster["existing"] = [];
  const candidates: ArtistRosterEntry[] = [];
  const review: ArtistRosterEntry[] = [];
  const missingProfile: ArtistRosterEntry[] = [];
  for (const entry of entries) {
    if (!entry.profileUrl) {
      missingProfile.push(entry);
      continue;
    }
    if (entry.rosterQualifier) {
      review.push(entry);
      continue;
    }
    const artistSlug = resolveArtistSlug(entry.displayName, known)
      ?? (entry.nativeNameCandidate ? resolveArtistSlug(entry.nativeNameCandidate, known) : null);
    if (artistSlug) existing.push({ entry, artistSlug });
    else candidates.push(entry);
  }
  return { existing, candidates, review, missingProfile };
}

function canonicalRosterUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function isCollectiveLabel(label: string): boolean {
  return /\s&\s/.test(label) || /\b(collective|duo|collaboration)\b/i.test(label);
}

function isEstateLabel(label: string): boolean {
  return /\bestate\b/i.test(label);
}

function qualifierFor(label: string, section: RosterQualifier | null): RosterQualifier | null {
  if (isCollectiveLabel(label)) return "COLLECTIVE_CANDIDATE";
  if (isEstateLabel(label) || section === "ESTATE") return "ESTATE";
  if (/\[[^\]]*\]/.test(label)) return "UNKNOWN_ENTITY_TYPE";
  return section;
}

function hangulName(label: string): string | null {
  return /[가-힣]/.test(label) ? label : null;
}

function entry(roster: TrustedArtistRoster, rawLabel: string, href: string | null, section: RosterQualifier | null, nativeName: string | null): ArtistRosterEntry | null {
  const displayName = decodeHtml(rawLabel);
  if (!displayName || /^(artists|estate|cookie preferences)$/i.test(displayName)) return null;
  return {
    displayName,
    nativeNameCandidate: nativeName ? decodeHtml(nativeName) : hangulName(displayName),
    profileUrl: href ? acceptProfile(roster, href) : null,
    indexUrl: roster.indexUrl,
    sourceName: roster.sourceName,
    sourceHost: roster.host,
    sourceType: "GALLERY_ROSTER",
    rosterQualifier: qualifierFor(displayName, section),
    adapter: roster.adapter,
    rawLabel: displayName,
  };
}

function acceptProfile(roster: TrustedArtistRoster, href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, roster.indexUrl);
  } catch {
    return null;
  }
  if (url.hostname.toLowerCase().replace(/^www\./, "") !== roster.host) return null;
  if (!classifyTrustedUrl(url.toString())) return null;
  const path = `${url.pathname}${url.search}`.toLowerCase();
  if (path.includes("/news") || path.includes("/press") || path.includes("/shop")) return null;
  if (!profilePathAllowed(roster.adapter, `${url.pathname}${url.search}`)) return null;
  return url.toString();
}

function profilePathAllowed(adapter: RosterAdapter, pathAndSearch: string): boolean {
  if (adapter === "kukje-roster") return /\/artists\/view$/i.test(pathAndSearch.split("?")[0] ?? "") && /[?&]seq=\d+/i.test(pathAndSearch);
  if (adapter === "hyundai-roster") return /\/artist\/view\/\d+$/i.test(pathAndSearch.split("?")[0] ?? "");
  return /\/artists\/\d+-[^/]+\/?$/i.test(pathAndSearch.split("?")[0] ?? "");
}

function parseKukjeRoster(html: string, roster: TrustedArtistRoster): ArtistRosterEntry[] {
  const anchors = html.match(/<a\b[^>]*href="[^"]*\/artists\/view\?seq=\d+"[^>]*>[\s\S]*?<\/a>/gi) ?? [];
  const out: ArtistRosterEntry[] = [];
  for (const anchor of anchors) {
    const href = anchor.match(/href="([^"]*\/artists\/view\?seq=\d+)"/i)?.[1] ?? null;
    const main = anchor.match(/artists-main-list__name">([^<]+)/i)?.[1] ?? "";
    const spans = [...anchor.matchAll(/<span[^>]*>([^<]+)<\/span>/gi)].map((match) => match[1] ?? "").map((value) => value.trim()).filter(Boolean);
    const name = decodeHtml(main) || spans[0] || "";
    const native = spans.find((span) => span !== name && /[가-힣]/.test(span)) ?? null;
    const row = name ? entry(roster, name, href, null, native) : null;
    if (row) out.push(row);
  }
  return collapseSameProfile(out);
}

function parseHyundaiRoster(html: string, roster: TrustedArtistRoster): ArtistRosterEntry[] {
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const out: ArtistRosterEntry[] = [];
  for (const anchor of anchors) {
    const href = anchor[1] ?? "";
    if (!/\/artist\/view\//i.test(href)) continue;
    const row = entry(roster, anchor[2] ?? "", href, null, null);
    if (row) out.push(row);
  }
  return out;
}

function parseArarioRoster(html: string, roster: TrustedArtistRoster): ArtistRosterEntry[] {
  const marks: { index: number; section: string | null; href: string | null; name: string | null }[] = [];
  for (const match of html.matchAll(/<div[^>]*class="subheading"[^>]*>[\s\S]*?<span>([^<]*)<\/span>/gi)) {
    marks.push({ index: match.index ?? 0, section: match[1] ?? "", href: null, name: null });
  }
  const anchorRe = /<a\b[^>]*href="([^"]*\/artists\/\d+-[^"]*)"[^>]*>(?:(?!<\/a>)[\s\S])*?<h2>([\s\S]*?)<\/h2>/gi;
  for (const match of html.matchAll(anchorRe)) {
    marks.push({ index: match.index ?? 0, section: null, href: match[1] ?? "", name: match[2] ?? "" });
  }
  marks.sort((left, right) => left.index - right.index);
  let section: RosterQualifier | null = null;
  const out: ArtistRosterEntry[] = [];
  for (const mark of marks) {
    if (mark.href == null) {
      section = /^estate$/i.test(decodeHtml(mark.section ?? "")) ? "ESTATE" : null;
      continue;
    }
    const row = entry(roster, mark.name ?? "", mark.href, section, null);
    if (row) out.push(row);
  }
  return out;
}

function collapseSameProfile(entries: ArtistRosterEntry[]): ArtistRosterEntry[] {
  const grouped = new Map<string, ArtistRosterEntry[]>();
  const loose: ArtistRosterEntry[] = [];
  for (const item of entries) {
    if (!item.profileUrl) {
      loose.push(item);
      continue;
    }
    const group = grouped.get(item.profileUrl) ?? [];
    group.push(item);
    grouped.set(item.profileUrl, group);
  }
  const collapsed: ArtistRosterEntry[] = [];
  for (const group of grouped.values()) {
    const labels = [...new Set(group.flatMap((item) => [item.displayName, item.nativeNameCandidate].filter((label): label is string => Boolean(label))))];
    const latin = labels.find((label) => /[A-Za-z]/.test(label)) ?? labels[0];
    if (!latin) continue;
    const native = labels.find((label) => label !== latin && /[가-힣]/.test(label)) ?? null;
    const collective = labels.some((label) => isCollectiveLabel(label));
    const qualifier = collective ? "COLLECTIVE_CANDIDATE" : qualifierFor(latin, null);
    const first = group[0];
    if (!first) continue;
    collapsed.push({
      ...first,
      displayName: latin,
      rawLabel: latin,
      nativeNameCandidate: native,
      rosterQualifier: qualifier,
    });
  }
  return [...collapsed, ...loose];
}

function markDuplicateLabels(entries: ArtistRosterEntry[]): ArtistRosterEntry[] {
  const seen = new Set<string>();
  return entries.map((item) => {
    const key = normalizeArtistLookup(item.displayName);
    if (!key) return item;
    if (!seen.has(key)) {
      seen.add(key);
      return item;
    }
    if (item.rosterQualifier) return item;
    return { ...item, rosterQualifier: "UNKNOWN_ENTITY_TYPE" };
  });
}
