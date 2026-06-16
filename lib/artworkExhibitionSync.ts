import { prisma } from "@/lib/prisma";
import { deriveArtworkTitle } from "@/lib/artworkSeriesSync";
import { FREE_PLAN_LIMITS } from "@/lib/freePlan";

/** When posting as exhibition, add a timeline ArtEvent entry. */
export async function syncExhibitionArtEvent(
  artistProfileId: string,
  title: string | null,
  caption: string | null,
) {
  const eventTitle = title || deriveArtworkTitle(null, caption);
  if (!eventTitle) return null;

  const year = new Date().getFullYear();
  const existing = await prisma.artEvent.findFirst({
    where: {
      artistId: artistProfileId,
      eventType: "exhibition",
      title: eventTitle,
      year,
    },
  });
  if (existing) return existing;

  const count = await prisma.artEvent.count({ where: { artistId: artistProfileId } });
  if (count >= FREE_PLAN_LIMITS.maxArtEventsPerArtist) return null;

  return prisma.artEvent.create({
    data: {
      artistId: artistProfileId,
      eventType: "exhibition",
      title: eventTitle,
      year,
      description: caption,
      isPublic: true,
    },
  });
}
