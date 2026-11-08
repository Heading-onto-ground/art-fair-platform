import type { Prisma, PrismaClient } from "@prisma/client";
import { aggregateSourceClearance, type SourceClearance } from "@/lib/history/policy";

export type SubmittedSourceDecision = "APPROVED" | "REJECTED";

export type SubmittedSourceQueueRow = {
  id: string;
  exhibitionTitle: string;
  exhibitionSlug: string | null;
  artists: string[];
  origin: string | null;
  contributorKind: string | null;
  url: string;
  hostname: string;
  sourceType: string;
  clearanceStatus: string;
  submittedAt: string;
  publicationStatus: string | null;
};

type ReviewClient = PrismaClient | Prisma.TransactionClient;

export function isSubmittedSourceDecision(value: unknown): value is SubmittedSourceDecision {
  return value === "APPROVED" || value === "REJECTED";
}

export async function listSubmittedSources(
  prisma: Pick<PrismaClient, "historySource">,
  status: "REVIEW_REQUIRED",
): Promise<SubmittedSourceQueueRow[]> {
  const rows = await prisma.historySource.findMany({
    where: { sourceType: "submitted-url", clearanceStatus: status },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      url: true,
      sourceType: true,
      clearanceStatus: true,
      createdAt: true,
      exhibitions: {
        select: {
          exhibition: {
            select: {
              title: true,
              historyMeta: { select: { slug: true, origin: true, contributorKind: true, publicationStatus: true } },
              historyArtists: { select: { artist: { select: { canonicalName: true, nativeName: true } } } },
            },
          },
        },
      },
    },
  });
  return rows.map((row) => {
    const exhibition = row.exhibitions[0]?.exhibition;
    return {
      id: row.id,
      exhibitionTitle: exhibition?.title ?? "Exhibition not linked",
      exhibitionSlug: exhibition?.historyMeta?.slug ?? null,
      artists: (exhibition?.historyArtists ?? []).map((link) => link.artist.nativeName || link.artist.canonicalName),
      origin: exhibition?.historyMeta?.origin ?? null,
      contributorKind: exhibition?.historyMeta?.contributorKind ?? null,
      url: row.url,
      hostname: sourceHostname(row.url),
      sourceType: row.sourceType,
      clearanceStatus: row.clearanceStatus,
      submittedAt: row.createdAt.toISOString(),
      publicationStatus: exhibition?.historyMeta?.publicationStatus ?? null,
    };
  });
}

export async function reviewSubmittedSource(
  prisma: PrismaClient,
  input: { sourceId: string; decision: SubmittedSourceDecision },
): Promise<
  | { ok: true; sourceClearance: SubmittedSourceDecision; exhibitions: { exhibitionId: string; sourceClearance: SourceClearance }[] }
  | { ok: false; error: string }
> {
  return prisma.$transaction(async (tx) => {
    const source = await tx.historySource.findUnique({
      where: { id: input.sourceId },
      select: { id: true, sourceType: true, exhibitions: { select: { exhibitionId: true } } },
    });
    if (!source || source.sourceType !== "submitted-url") {
      return { ok: false as const, error: "Only a submitted source can be reviewed here." };
    }
    await tx.historySource.update({
      where: { id: source.id },
      data: { clearanceStatus: input.decision },
    });
    const exhibitions = [];
    for (const link of source.exhibitions) {
      const sourceClearance = await syncExhibitionSourceClearance(tx, link.exhibitionId);
      exhibitions.push({ exhibitionId: link.exhibitionId, sourceClearance });
    }
    return { ok: true as const, sourceClearance: input.decision, exhibitions };
  });
}

export async function syncExhibitionSourceClearance(prisma: ReviewClient, exhibitionId: string): Promise<SourceClearance> {
  const attached = await prisma.exhibitionSource.findMany({
    where: { exhibitionId },
    select: { source: { select: { clearanceStatus: true } } },
  });
  const sourceClearance = aggregateSourceClearance(attached.map((row) => row.source.clearanceStatus));
  await prisma.exhibitionHistoryMeta.updateMany({
    where: { exhibitionId },
    data: { sourceClearance },
  });
  return sourceClearance;
}

function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
