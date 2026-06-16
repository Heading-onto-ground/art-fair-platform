import { prisma } from "@/lib/prisma";

export type ArtworkEngagement = {
  likeCount: number;
  collabCount: number;
  commentCount: number;
  liked: boolean;
  collabInterested: boolean;
};

export async function getArtworkEngagement(
  artworkId: string,
  viewerUserId?: string | null,
): Promise<ArtworkEngagement> {
  const [likeCount, collabCount, commentCount, liked, collabInterested] = await Promise.all([
    prisma.artworkLike.count({ where: { artworkId } }),
    prisma.artworkCollabInterest.count({ where: { artworkId } }),
    prisma.artworkComment.count({ where: { artworkId } }),
    viewerUserId
      ? prisma.artworkLike.findUnique({ where: { artworkId_userId: { artworkId, userId: viewerUserId } } }).then(Boolean)
      : Promise.resolve(false),
    viewerUserId
      ? prisma.artworkCollabInterest.findUnique({ where: { artworkId_userId: { artworkId, userId: viewerUserId } } }).then(Boolean)
      : Promise.resolve(false),
  ]);

  return { likeCount, collabCount, commentCount, liked, collabInterested };
}

export async function toggleArtworkLike(artworkId: string, userId: string): Promise<ArtworkEngagement> {
  const existing = await prisma.artworkLike.findUnique({
    where: { artworkId_userId: { artworkId, userId } },
  });
  if (existing) {
    await prisma.artworkLike.delete({ where: { artworkId_userId: { artworkId, userId } } });
  } else {
    await prisma.artworkLike.create({ data: { artworkId, userId } });
  }
  return getArtworkEngagement(artworkId, userId);
}

export async function toggleArtworkCollabInterest(artworkId: string, userId: string): Promise<ArtworkEngagement> {
  const existing = await prisma.artworkCollabInterest.findUnique({
    where: { artworkId_userId: { artworkId, userId } },
  });
  if (existing) {
    await prisma.artworkCollabInterest.delete({ where: { artworkId_userId: { artworkId, userId } } });
  } else {
    await prisma.artworkCollabInterest.create({ data: { artworkId, userId } });
  }
  return getArtworkEngagement(artworkId, userId);
}

export type ArtworkCommentView = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
};

export async function listArtworkComments(artworkId: string, limit = 50): Promise<ArtworkCommentView[]> {
  const comments = await prisma.artworkComment.findMany({
    where: { artworkId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  if (comments.length === 0) return [];

  const userIds = [...new Set(comments.map((c: { userId: string }) => c.userId))];
  const [artists, galleries, curators] = await Promise.all([
    prisma.artistProfile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, name: true } }),
    prisma.galleryProfile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, name: true } }),
    prisma.curatorProfile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, name: true } }),
  ]);

  const nameMap = new Map<string, { name: string; role: string }>();
  artists.forEach((p: { userId: string; name: string }) => nameMap.set(p.userId, { name: p.name, role: "artist" }));
  galleries.forEach((p: { userId: string; name: string }) => nameMap.set(p.userId, { name: p.name, role: "gallery" }));
  curators.forEach((p: { userId: string; name: string }) => nameMap.set(p.userId, { name: p.name, role: "curator" }));

  return comments.map((c: { id: string; body: string; createdAt: Date; userId: string }) => {
    const author = nameMap.get(c.userId);
    return {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      authorName: author?.name ?? "User",
      authorRole: author?.role ?? "user",
    };
  });
}

export async function addArtworkComment(artworkId: string, userId: string, body: string): Promise<ArtworkCommentView> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("body required");
  if (trimmed.length > 2000) throw new Error("body too long");

  const comment = await prisma.artworkComment.create({
    data: { artworkId, userId, body: trimmed },
  });

  const [artist, gallery, curator] = await Promise.all([
    prisma.artistProfile.findUnique({ where: { userId }, select: { name: true } }),
    prisma.galleryProfile.findUnique({ where: { userId }, select: { name: true } }),
    prisma.curatorProfile.findUnique({ where: { userId }, select: { name: true } }),
  ]);

  const name = artist?.name ?? gallery?.name ?? curator?.name ?? "User";
  const role = artist ? "artist" : gallery ? "gallery" : curator ? "curator" : "user";

  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    authorName: name,
    authorRole: role,
  };
}
