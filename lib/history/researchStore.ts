import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import { aliasLookupEqual, resolveVerifiedAlias } from "@/lib/history/identity";
import type { KnownArtist } from "@/lib/history/researchAdvance";
import {
  jobIsOpen,
  type ResearchJobRecord,
  type ResearchPayload,
  type ResearchStage,
  type ResearchStatus,
} from "@/lib/history/researchJob";
import type { HistoryLocale } from "@/lib/history/locale";

const prisma = untypedPrisma as PrismaClient;

type Row = {
  id: string;
  query: string;
  normalizedQuery: string;
  locale: string;
  status: string;
  stage: string;
  demandQuality: string;
  requestedAt: Date;
  startedAt: Date | null;
  updatedAt: Date;
  completedAt: Date | null;
  resolvedArtistId: string | null;
  resolvedArtistSlug: string | null;
  identityStatus: string | null;
  sourcesFound: number;
  sourcesChecked: number;
  verifiedFactCount: number;
  reviewFactCount: number;
  blockedSourceCount: number;
  failureCode: string | null;
  failureDetail: string | null;
  resultArtistSlug: string | null;
  payload: Prisma.JsonValue;
};

function asRecord(row: Row): ResearchJobRecord {
  return {
    id: row.id,
    query: row.query,
    normalizedQuery: row.normalizedQuery,
    locale: row.locale === "ko" ? "ko" : "en",
    status: row.status as ResearchStatus,
    stage: row.stage as ResearchStage,
    demandQuality: row.demandQuality,
    requestedAt: row.requestedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    resolvedArtistId: row.resolvedArtistId,
    resolvedArtistSlug: row.resolvedArtistSlug,
    identityStatus: row.identityStatus,
    sourcesFound: row.sourcesFound,
    sourcesChecked: row.sourcesChecked,
    verifiedFactCount: row.verifiedFactCount,
    reviewFactCount: row.reviewFactCount,
    blockedSourceCount: row.blockedSourceCount,
    failureCode: row.failureCode,
    failureDetail: row.failureDetail,
    resultArtistSlug: row.resultArtistSlug,
    payload: row.payload as ResearchPayload,
  };
}

function data(job: ResearchJobRecord): Prisma.ResearchJobUpdateInput {
  return {
    query: job.query,
    normalizedQuery: job.normalizedQuery,
    locale: job.locale,
    status: job.status,
    stage: job.stage,
    demandQuality: job.demandQuality,
    startedAt: job.startedAt ? new Date(job.startedAt) : null,
    completedAt: job.completedAt ? new Date(job.completedAt) : null,
    resolvedArtistId: job.resolvedArtistId,
    resolvedArtistSlug: job.resolvedArtistSlug,
    identityStatus: job.identityStatus,
    sourcesFound: job.sourcesFound,
    sourcesChecked: job.sourcesChecked,
    verifiedFactCount: job.verifiedFactCount,
    reviewFactCount: job.reviewFactCount,
    blockedSourceCount: job.blockedSourceCount,
    failureCode: job.failureCode,
    failureDetail: job.failureDetail,
    resultArtistSlug: job.resultArtistSlug,
    payload: job.payload as Prisma.InputJsonValue,
  };
}

export async function listJobsForQuery(normalizedQuery: string): Promise<ResearchJobRecord[]> {
  const rows = await prisma.researchJob.findMany({
    where: { normalizedQuery },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  return rows.map((row) => asRecord(row as Row));
}

export async function readResearchJob(id: string): Promise<ResearchJobRecord | null> {
  const row = await prisma.researchJob.findUnique({ where: { id } });
  return row ? asRecord(row as Row) : null;
}

export async function insertResearchJob(job: ResearchJobRecord): Promise<ResearchJobRecord> {
  const row = await prisma.researchJob.create({
    data: {
      id: job.id,
      requestedAt: new Date(job.requestedAt),
      ...(data(job) as Prisma.ResearchJobCreateInput),
    },
  });
  return asRecord(row as Row);
}

export async function saveResearchJob(job: ResearchJobRecord): Promise<ResearchJobRecord> {
  const row = await prisma.researchJob.update({ where: { id: job.id }, data: data(job) });
  return asRecord(row as Row);
}

export async function findKnownArtist(query: string): Promise<KnownArtist | null> {
  const verified = resolveVerifiedAlias(query);
  const rows = await prisma.artistEntity.findMany({
    where: verified
      ? { slug: verified }
      : {
          OR: [
            { canonicalName: { equals: query.trim(), mode: "insensitive" } },
            { nativeName: { equals: query.trim(), mode: "insensitive" } },
            { aliases: { some: { label: { equals: query.trim(), mode: "insensitive" } } } },
          ],
        },
    select: {
      id: true,
      slug: true,
      canonicalName: true,
      nativeName: true,
      aliases: { select: { label: true } },
      participations: { where: { exhibition: { historyMeta: { publicationStatus: "PUBLIC" } } }, select: { id: true } },
    },
    take: 8,
  });
  const matches = rows.filter((row) => {
    if (verified) return row.slug === verified;
    const labels = [row.canonicalName, row.nativeName, ...row.aliases.map((alias) => alias.label)];
    return labels.some((label) => label && aliasLookupEqual(label, query));
  });
  if (matches.length !== 1) return null;
  const artist = matches[0];
  if (!artist) return null;
  return {
    id: artist.id,
    slug: artist.slug,
    canonicalName: artist.canonicalName,
    nativeName: artist.nativeName,
    exhibitionCount: artist.participations.length,
  };
}

export function openJob(jobs: ResearchJobRecord[]): ResearchJobRecord | null {
  return jobs.find((job) => jobIsOpen(job)) ?? null;
}

export async function claimResearchRun(id: string): Promise<boolean> {
  // The WHERE clause is workflowClaimAvailable: stage is open and workflowRunId is empty.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "ResearchJob"
    SET payload = jsonb_set(COALESCE(payload, '{}'::jsonb), '{workflowRunId}', '"pending"', true),
        "updatedAt" = NOW()
    WHERE id = ${id}
      AND stage <> 'DONE'
      AND (payload->>'workflowRunId' IS NULL OR payload->>'workflowRunId' = '')
    RETURNING id
  `;
  return rows.length > 0;
}

export async function saveResearchRunId(id: string, runId: string): Promise<void> {
  const token = JSON.stringify(runId);
  await prisma.$executeRaw`
    UPDATE "ResearchJob"
    SET payload = jsonb_set(COALESCE(payload, '{}'::jsonb), '{workflowRunId}', ${token}::jsonb, true),
        "updatedAt" = NOW()
    WHERE id = ${id}
      AND payload->>'workflowRunId' = 'pending'
  `;
}

export async function releaseResearchRun(id: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "ResearchJob"
    SET payload = payload - 'workflowRunId',
        "updatedAt" = NOW()
    WHERE id = ${id}
      AND payload->>'workflowRunId' = 'pending'
  `;
}

export type { HistoryLocale };
