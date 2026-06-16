import { prisma } from "@/lib/prisma";
import { FREE_PLAN_LIMITS } from "@/lib/freePlan";
import {
  findBestSeriesMatch,
  suggestSeriesTitle,
  extractTitleFromCaption,
} from "@/lib/seriesMatcher";

type AssignSeriesResult = {
  seriesId: string | null;
  seriesTitle: string | null;
  createdSeries: boolean;
};

export async function assignArtworkToSeries(
  artistProfileId: string,
  title: string | null,
  caption: string | null,
  explicitSeriesId?: string | null,
): Promise<AssignSeriesResult> {
  if (explicitSeriesId) {
    const existing = await prisma.artworkSeries.findFirst({
      where: { id: explicitSeriesId, artistId: artistProfileId },
      select: { id: true, title: true },
    });
    if (existing) {
      return { seriesId: existing.id, seriesTitle: existing.title, createdSeries: false };
    }
  }

  const seriesList = await prisma.artworkSeries.findMany({
    where: { artistId: artistProfileId },
    select: { id: true, title: true },
  });

  const match = findBestSeriesMatch(title, caption, seriesList);
  if (match) {
    return { seriesId: match.id, seriesTitle: match.title, createdSeries: false };
  }

  const suggested = suggestSeriesTitle(title, caption);
  if (!suggested) {
    return { seriesId: null, seriesTitle: null, createdSeries: false };
  }

  const dup = seriesList.find(
    (s: { id: string; title: string }) => s.title.trim().toLowerCase() === suggested.toLowerCase(),
  );
  if (dup) {
    return { seriesId: dup.id, seriesTitle: dup.title, createdSeries: false };
  }

  if (seriesList.length >= FREE_PLAN_LIMITS.maxSeriesPerArtist) {
    return { seriesId: null, seriesTitle: null, createdSeries: false };
  }

  const created = await prisma.artworkSeries.create({
    data: {
      artistId: artistProfileId,
      title: suggested,
      description: caption?.trim() || null,
      isPublic: true,
    },
    select: { id: true, title: true },
  });

  return { seriesId: created.id, seriesTitle: created.title, createdSeries: true };
}

export function deriveArtworkTitle(
  title?: string | null,
  caption?: string | null,
): string | null {
  const t = title?.trim();
  if (t) return t.slice(0, 120);
  const fromCaption = extractTitleFromCaption(caption || "");
  return fromCaption ? fromCaption.slice(0, 120) : null;
}
