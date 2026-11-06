import { revalidateTag } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import type { GrowthSnapshot } from "@/lib/history/growth";
import { fetchTrustedDocument } from "@/lib/history/trustedCrawl";
import { advanceResearchJob, type ResearchDeps } from "@/lib/history/researchAdvance";
import { publishResearchFact } from "@/lib/history/researchPublish";
import { researchStepDisposition, signalsToRecord, type ResearchJobRecord } from "@/lib/history/researchJob";
import { syncCandidatesWithJob } from "@/lib/history/expansionStore";
import { findKnownArtist, readResearchJob, saveResearchJob } from "@/lib/history/researchStore";
import { PUBLIC_HISTORY_CACHE_TAG } from "@/lib/history/publicGraph";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import {
  entitiesFromPayload,
  fetchWikidata,
  searchEntityIds,
  toDiscoveryInstitution,
  type WikidataApiEntity,
} from "@/lib/history/wikidataIdentity";
import type { DiscoveryInstitution } from "@/lib/history/sourceDiscovery";

const prisma = untypedPrisma as PrismaClient;

async function loadSnapshot(): Promise<GrowthSnapshot | null> {
  try {
    const rows = await prisma.exhibition.findMany({
      where: { historyMeta: { publicationStatus: "PUBLIC" } },
      select: {
        id: true,
        title: true,
        city: true,
        space: { select: { name: true } },
        historyMeta: { select: { startYear: true } },
        historyArtists: { select: { artist: { select: { slug: true } } } },
      },
      take: 500,
    });
    return {
      artists: [],
      unresolved: [],
      exhibitions: rows.map((row) => ({
        id: row.id,
        title: row.title,
        year: row.historyMeta?.startYear ?? null,
        space: row.space?.name ?? null,
        city: row.city,
        artistSlugs: row.historyArtists.map((item) => item.artist.slug),
      })),
    };
  } catch {
    return null;
  }
}

function failureCode(error: unknown): "SOURCE_RATE_LIMITED" | "FETCH_FAILED" {
  if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "SOURCE_RATE_LIMITED") {
    return "SOURCE_RATE_LIMITED";
  }
  return "FETCH_FAILED";
}

export function researchDeps(): ResearchDeps {
  return {
    now: () => new Date(),
    findKnown: findKnownArtist,
    lookupIdentity: async (query) => {
      try {
        const search = await fetchWikidata(`action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&uselang=en&type=item&limit=5&format=json`);
        const ids = searchEntityIds(search, 5);
        if (ids.length === 0) return { entities: [], institutions: [], error: null };
        const detail = await fetchWikidata(`action=wbgetentities&ids=${ids.join("|")}&props=labels|aliases|descriptions|claims&languages=en|ko&format=json`);
        const parsed = entitiesFromPayload(detail);
        return { entities: parsed.artists, institutions: [], error: null };
      } catch (error) {
        return { entities: [], institutions: [], error: failureCode(error) };
      }
    },
    loadInstitutions: async (ids) => {
      if (ids.length === 0) return [];
      try {
        const detail = await fetchWikidata(`action=wbgetentities&ids=${ids.join("|")}&props=labels|descriptions|claims&languages=en|ko&format=json`);
        const bag = detail && typeof detail === "object" && "entities" in detail
          ? (detail as { entities?: Record<string, WikidataApiEntity> }).entities ?? {}
          : {};
        const institutions: DiscoveryInstitution[] = [];
        for (const [id, entity] of Object.entries(bag)) {
          if (!entity) continue;
          institutions.push(toDiscoveryInstitution(entity.id || id, entity));
        }
        return institutions;
      } catch {
        return [];
      }
    },
    fetchDocument: (url) => fetchTrustedDocument(url, { timeoutMs: 12_000 }),
    loadSnapshot,
    publish: publishResearchFact,
  };
}

export async function stepResearchJob(job: Parameters<typeof advanceResearchJob>[0]) {
  return advanceResearchJob(job, researchDeps());
}

export async function persistResearchProgress(before: ResearchJobRecord, after: ResearchJobRecord): Promise<ResearchJobRecord> {
  const fresh = after.payload.emitted.filter((name) => !before.payload.emitted.includes(name));
  const saved = await saveResearchJob(after);
  // Autonomous expansion jobs never write DISCOVERY_* visitor funnel events.
  for (const name of signalsToRecord(saved, fresh)) {
    try {
      const path = `/research/${saved.id}`;
      const existing = await prisma.historySignal.findFirst({ where: { name, path }, select: { id: true } });
      if (!existing) await prisma.historySignal.create({ data: { name, path } });
    } catch (error) {
      if (!isHistoryUnavailable(error)) console.error("discovery signal failed", error);
    }
  }
  if (saved.stage === "DONE" || saved.identityStatus !== before.identityStatus) {
    await syncCandidatesWithJob(saved);
  }
  if (saved.resultArtistSlug && saved.resultArtistSlug !== before.resultArtistSlug) {
    try {
      revalidateTag(PUBLIC_HISTORY_CACHE_TAG);
    } catch {
      // Cache refresh is separate from the stored fact.
    }
  }
  return saved;
}

export async function advancePersistedJob(jobId: string): Promise<ResearchJobRecord | null> {
  const current = await readResearchJob(jobId);
  if (!current || current.stage === "DONE") return current;
  const advanced = await stepResearchJob(current);
  return persistResearchProgress(current, advanced);
}

export function persistedDisposition(job: ResearchJobRecord | null): "retry" | "stop" | "continue" {
  if (!job) return "stop";
  return researchStepDisposition(job);
}
