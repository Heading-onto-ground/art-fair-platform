import { countBridgePaths, limitedPublicFactualDecision, slugifyName, uniqueSlug } from "@/lib/history/policy";

export const IMPORT_VERSION = "public-beta-seed-20261009";

export type LaunchFact = {
  contentClass: string;
  artistNames: string[];
  title: string;
  year: string;
  datePrecision: string;
  venue: string;
  city: string;
  country: string;
  curator: string | null;
  sourceUrl: string;
};

export type LaunchMapRecord = {
  pilotRecordId: string;
  role: string;
  facts: LaunchFact;
  explicitParticipants: string[];
  namedInTitleNotInLaunchSet?: string[];
  artistEntities: string[];
  space: string;
  alsoStatedOn?: string[];
};

export type LaunchMap = {
  sources: { sourceUrl: string; records: LaunchMapRecord[] }[];
};

export type KnownEntity = {
  id: string;
  canonicalName: string;
  nativeName: string | null;
  aliases: string[];
};

export type KnownSpace = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
};

export const LAUNCH_ARTISTS = [
  { key: "A01", canonicalName: "Lee Ufan", nativeName: "이우환", aliases: ["Lee Ufan", "이우환"] },
  { key: "A07", canonicalName: "Park Seo-Bo", nativeName: "박서보", aliases: ["Park Seo-Bo", "박서보"] },
  { key: "A08", canonicalName: "Ha Chong-Hyun", nativeName: "하종현", aliases: ["Ha Chong-Hyun", "하종현"] },
  { key: "A10", canonicalName: "Chung Sang-Hwa", nativeName: "정상화", aliases: ["Chung Sang-Hwa", "정상화"] },
] as const;

const KUKJE_CHECKS = {
  publicPage: true,
  loginRequired: false,
  paywall: false,
  captchaBypass: false,
  technicalCircumvention: false,
  officialArtSource: true,
  factualMetadataOnly: true,
  copiesProse: false,
  copiesImages: false,
  sourceUrlPreserved: true,
  bulkDatabaseClone: false,
  explicitProhibition: false,
  correctionPath: true,
  independentGraph: true,
};

export function kukjeInternalUse() {
  return {
    internalUseDecision: limitedPublicFactualDecision(KUKJE_CHECKS),
    externalPermission: "NOT_OBTAINED" as const,
    contentScope: "FACTUAL_METADATA_ONLY" as const,
    sourceFamily: "kukjegallery.com",
    sourceName: "Kukje Gallery",
    sourceType: "OFFICIAL_GALLERY_PAGE",
  };
}

function norm(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function resolveLaunchArtist(
  artist: (typeof LAUNCH_ARTISTS)[number],
  entities: KnownEntity[],
): { status: "reuse"; id: string } | { status: "create" } | { status: "ambiguous"; ids: string[] } {
  const names = new Set(artist.aliases.map(norm));
  const hits = entities.filter((entity) => {
    const labels = [entity.canonicalName, entity.nativeName ?? "", ...entity.aliases];
    return labels.some((label) => names.has(norm(label)));
  });
  if (hits.length > 1) return { status: "ambiguous", ids: hits.map((hit) => hit.id) };
  if (hits.length === 1) return { status: "reuse", id: hits[0].id };
  return { status: "create" };
}

export function resolveSpace(space: { name: string; city: string; country: string }, spaces: KnownSpace[]): { status: "reuse"; id: string } | { status: "create" } {
  const hit = spaces.find((item) => norm(item.name) === norm(space.name) && norm(item.city ?? "") === norm(space.city) && norm(item.country ?? "") === norm(space.country));
  return hit ? { status: "reuse", id: hit.id } : { status: "create" };
}

export function recordAcceptsFactualImport(record: LaunchMapRecord): boolean {
  if (record.facts.contentClass !== "FACTUAL_METADATA") return false;
  if (!record.facts.title.trim() || !record.facts.year.trim() || !record.facts.venue.trim() || !record.facts.city.trim()) return false;
  if (record.facts.datePrecision !== "YEAR") return false;
  const blob = JSON.stringify(record);
  if (/\/upload\/artworks\/|https?:\/\/[^\s"]+\.(?:jpg|jpeg|png|gif|webp)\b/i.test(blob)) return false;
  if (/\b[A-Za-z]{1,2}\d{4}\b/.test(`${record.facts.title} ${record.facts.city} ${record.facts.venue}`)) return false;
  return record.explicitParticipants.every((name) => record.facts.title.toLowerCase().includes(name.toLowerCase()) || record.artistEntities.length === 1);
}

export function uniqueLaunchRecords(map: LaunchMap): LaunchMapRecord[] {
  const byId = new Map<string, LaunchMapRecord>();
  for (const source of map.sources) {
    for (const record of source.records) {
      const current = byId.get(record.pilotRecordId);
      if (!current) {
        byId.set(record.pilotRecordId, record);
        continue;
      }
      const urls = new Set([...(current.alsoStatedOn ?? []), current.facts.sourceUrl, record.facts.sourceUrl, ...(record.alsoStatedOn ?? [])]);
      urls.delete(current.facts.sourceUrl);
      current.alsoStatedOn = [...urls];
    }
  }
  return [...byId.values()];
}

export function buildLaunchPlan(map: LaunchMap, entities: KnownEntity[], spaces: KnownSpace[]) {
  const policy = kukjeInternalUse();
  const artists = LAUNCH_ARTISTS.map((artist) => ({ ...artist, resolution: resolveLaunchArtist(artist, entities) }));
  const blocked = artists.filter((artist) => artist.resolution.status === "ambiguous");
  const records = uniqueLaunchRecords(map);
  const accepted = records.filter(recordAcceptsFactualImport);
  const skipped = records.filter((record) => !recordAcceptsFactualImport(record));
  const spacePlans = accepted.map((record) => ({
    pilotRecordId: record.pilotRecordId,
    name: record.facts.venue,
    city: record.facts.city,
    country: record.facts.country,
    resolution: resolveSpace({ name: record.facts.venue, city: record.facts.city, country: record.facts.country }, spaces),
  }));
  const slugs = new Set<string>();
  const exhibitionPlans = accepted.map((record) => {
    const slug = uniqueSlug(record.facts.title, slugs);
    slugs.add(slug);
    return {
      pilotRecordId: record.pilotRecordId,
      slug,
      title: record.facts.title,
      year: Number(record.facts.year),
      city: record.facts.city,
      country: record.facts.country,
      venue: record.facts.venue,
      artistKeys: record.artistEntities,
      explicitParticipants: record.explicitParticipants,
      unresolved: record.namedInTitleNotInLaunchSet ?? [],
      sourceUrls: [record.facts.sourceUrl, ...(record.alsoStatedOn ?? [])].filter((url, index, all) => all.indexOf(url) === index),
    };
  });
  const bridges = countBridgePaths(exhibitionPlans.map((plan) => ({ artistIds: plan.artistKeys })));
  const counts: Record<string, number> = {};
  for (const plan of exhibitionPlans) {
    for (const key of plan.artistKeys) {
      const artist = LAUNCH_ARTISTS.find((item) => item.key === key);
      if (!artist) continue;
      counts[artist.canonicalName] = (counts[artist.canonicalName] ?? 0) + 1;
    }
  }
  return {
    policy,
    artists,
    blocked,
    exhibitions: exhibitionPlans,
    spaces: spacePlans,
    skipped: skipped.map((record) => record.pilotRecordId),
    bridges,
    productionCounts: counts,
    sourceUrls: [...new Set(exhibitionPlans.flatMap((plan) => plan.sourceUrls))],
  };
}

export function artistSlugBase(name: string): string {
  return slugifyName(name);
}
