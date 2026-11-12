import type { PrismaClient } from "@prisma/client";
import { isFactualUseOk } from "@/lib/history/policy";
import { publicExhibitionWhere } from "@/lib/history/queries";
import { prisma as untypedPrisma } from "@/lib/prisma";

const prisma = untypedPrisma as PrismaClient;
import {
  buildDiscoveryGraph,
  discoverArtists,
  type DiscoveryEntityRow,
  type DiscoveryExhibitionRow,
  type DiscoveryOutcome,
  type ParsedDiscovery,
} from "@/lib/pro/discoveryPolicy";

/**
 * One public-exhibition read and one artist read, then the pure filter.
 * The public where is the same object Artist World uses. Artist country and city are not selected.
 * At a few thousand public exhibitions this stays in one pass. Push the filters into SQL only if that read stops being cheap.
 */
export async function loadPublicDiscoveryGraph() {
  const [entities, exhibitions] = await Promise.all([
    prisma.artistEntity.findMany({
      select: {
        id: true,
        slug: true,
        canonicalName: true,
        nativeName: true,
        profileId: true,
        aliases: { select: { label: true } },
      },
    }),
    prisma.exhibition.findMany({
      where: publicExhibitionWhere,
      select: {
        id: true,
        title: true,
        isPublic: true,
        createdBy: true,
        startDate: true,
        endDate: true,
        city: true,
        country: true,
        space: { select: { id: true, name: true, city: true, country: true, slugRecord: { select: { slug: true } } } },
        historyMeta: {
          select: {
            slug: true,
            datePrecision: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            endYear: true,
            endMonth: true,
            endDay: true,
            publicationStatus: true,
            origin: true,
            sourceClearance: true,
          },
        },
        historySources: { select: { source: { select: { internalUseDecision: true, contentScope: true } } } },
        historyArtists: { select: { artistEntityId: true } },
        artists: { where: { status: "confirmed" }, select: { artistId: true } },
      },
    }),
  ]);

  const entityRows: DiscoveryEntityRow[] = entities.map((entity) => ({
    id: entity.id,
    slug: entity.slug,
    canonicalName: entity.canonicalName,
    nativeName: entity.nativeName,
    profileId: entity.profileId,
    aliases: entity.aliases.map((alias) => alias.label),
  }));

  const exhibitionRows: DiscoveryExhibitionRow[] = exhibitions.map((exhibition) => ({
    id: exhibition.id,
    title: exhibition.title,
    isPublic: exhibition.isPublic,
    createdBy: exhibition.createdBy,
    startDate: exhibition.startDate,
    endDate: exhibition.endDate,
    city: exhibition.city,
    country: exhibition.country,
    space: exhibition.space
      ? {
          id: exhibition.space.id,
          name: exhibition.space.name,
          city: exhibition.space.city,
          country: exhibition.space.country,
          slug: exhibition.space.slugRecord?.slug ?? null,
        }
      : null,
    slug: exhibition.historyMeta?.slug ?? null,
    datePrecision: exhibition.historyMeta?.datePrecision ?? null,
    startYear: exhibition.historyMeta?.startYear ?? null,
    startMonth: exhibition.historyMeta?.startMonth ?? null,
    startDay: exhibition.historyMeta?.startDay ?? null,
    endYear: exhibition.historyMeta?.endYear ?? null,
    endMonth: exhibition.historyMeta?.endMonth ?? null,
    endDay: exhibition.historyMeta?.endDay ?? null,
    publicationStatus: exhibition.historyMeta?.publicationStatus ?? null,
    origin: exhibition.historyMeta?.origin ?? null,
    sourceClearance: exhibition.historyMeta?.sourceClearance ?? null,
    limitedFactualSource: exhibition.historySources.some(
      (join) => isFactualUseOk(join.source.internalUseDecision) && join.source.contentScope === "FACTUAL_METADATA_ONLY",
    ),
    participantEntityIds: exhibition.historyArtists.map((join) => join.artistEntityId),
    confirmedProfileIds: exhibition.artists.map((join) => join.artistId),
  }));

  return buildDiscoveryGraph(exhibitionRows, entityRows);
}

export async function queryDiscovery(applied: ParsedDiscovery, now = new Date()): Promise<DiscoveryOutcome> {
  return discoverArtists(await loadPublicDiscoveryGraph(), applied, { now });
}
