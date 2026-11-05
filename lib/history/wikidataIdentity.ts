import type { DiscoveryEntity, DiscoveryInstitution } from "@/lib/history/sourceDiscovery";

/**
 * Same Wikidata claim mapping as scripts/discover-sources.ts.
 * Wikidata identifies a person. It is not exhibition provenance.
 */

export const WIKIDATA_USER_AGENT = "ROB-source-discovery/1.0 (art-history preview; identity check only)";

export type WikidataApiEntity = {
  id?: string;
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  aliases?: Record<string, { value?: string }[]>;
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
};

function claimValues(entity: WikidataApiEntity, prop: string): unknown[] {
  return (entity.claims?.[prop] ?? []).flatMap((claim) => {
    const value = claim.mainsnak?.datavalue?.value;
    return value === undefined ? [] : [value];
  });
}

function claimIds(entity: WikidataApiEntity, prop: string): string[] {
  return claimValues(entity, prop).flatMap((value) => {
    if (typeof value === "object" && value && "id" in value && typeof value.id === "string") return [value.id];
    return [];
  });
}

function claimStrings(entity: WikidataApiEntity, prop: string): string[] {
  return claimValues(entity, prop).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function textOf(map: Record<string, { value?: string }> | undefined): string {
  return map?.en?.value || map?.ko?.value || Object.values(map ?? []).find((item) => item.value)?.value || "";
}

export function toDiscoveryEntity(id: string, entity: WikidataApiEntity): DiscoveryEntity {
  const label = textOf(entity.labels);
  const labels = Object.values(entity.labels ?? {}).flatMap((item) => (item.value ? [item.value] : []));
  const aliases = [...new Set([
    ...Object.values(entity.aliases ?? {}).flatMap((items) => items.flatMap((item) => (item.value ? [item.value] : []))),
    ...labels.filter((value) => value !== label),
  ])];
  return {
    id,
    label,
    description: textOf(entity.descriptions),
    aliases,
    instanceOf: claimIds(entity, "P31"),
    occupations: claimIds(entity, "P106"),
    officialWebsites: claimStrings(entity, "P856"),
    collectionIds: claimIds(entity, "P6379"),
  };
}

export function toDiscoveryInstitution(id: string, entity: WikidataApiEntity): DiscoveryInstitution {
  return {
    id,
    label: textOf(entity.labels),
    description: textOf(entity.descriptions),
    instanceOf: claimIds(entity, "P31"),
    officialWebsites: claimStrings(entity, "P856"),
  };
}

export function searchEntityIds(payload: unknown, limit = 5): string[] {
  if (!payload || typeof payload !== "object" || !("search" in payload) || !Array.isArray(payload.search)) return [];
  const ids: string[] = [];
  for (const row of payload.search) {
    if (ids.length >= limit) break;
    if (row && typeof row === "object" && "id" in row && typeof row.id === "string" && /^Q\d+$/.test(row.id)) ids.push(row.id);
  }
  return ids;
}

export function entitiesFromPayload(payload: unknown): { artists: DiscoveryEntity[]; institutions: DiscoveryInstitution[] } {
  if (!payload || typeof payload !== "object" || !("entities" in payload)) return { artists: [], institutions: [] };
  const bag = (payload as { entities?: Record<string, WikidataApiEntity> }).entities ?? {};
  const artists: DiscoveryEntity[] = [];
  const institutions: DiscoveryInstitution[] = [];
  for (const [id, entity] of Object.entries(bag)) {
    if (!entity || entity.id === undefined && !id.startsWith("Q")) continue;
    const qid = entity.id || id;
    if (entity.claims?.P106 || entity.claims?.P31) artists.push(toDiscoveryEntity(qid, entity));
    else institutions.push(toDiscoveryInstitution(qid, entity));
  }
  return { artists, institutions };
}

export async function fetchWikidata(query: string, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const response = await fetchImpl(`https://www.wikidata.org/w/api.php?${query}`, {
    headers: { "user-agent": WIKIDATA_USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  const text = await response.text();
  if (!response.ok || text.startsWith("You are making too many requests")) {
    const error = new Error("WIKIDATA_RATE_LIMIT");
    (error as Error & { code?: string }).code = response.status === 429 ? "SOURCE_RATE_LIMITED" : "FETCH_FAILED";
    throw error;
  }
  return JSON.parse(text) as unknown;
}
