import { prisma } from "@/lib/prisma";
import { parseHashtags } from "@/lib/hashtags";

/** Replace hashtag links for an artwork (from caption text). */
export async function syncArtworkHashtags(artworkId: string, caption: string | null) {
  const tags = parseHashtags(caption);

  await prisma.artworkHashtag.deleteMany({ where: { artworkId } });

  if (tags.length === 0) return tags;

  for (const tag of tags) {
    const hashtag = await prisma.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {},
    });
    await prisma.artworkHashtag.create({
      data: { artworkId, hashtagId: hashtag.id },
    });
  }

  return tags;
}

export async function loadHashtagsForArtworks(artworkIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (artworkIds.length === 0) return map;

  const rows = await prisma.artworkHashtag.findMany({
    where: { artworkId: { in: artworkIds } },
    include: { hashtag: { select: { tag: true } } },
  });

  for (const row of rows) {
    const list = map.get(row.artworkId) ?? [];
    list.push(row.hashtag.tag);
    map.set(row.artworkId, list);
  }
  return map;
}
