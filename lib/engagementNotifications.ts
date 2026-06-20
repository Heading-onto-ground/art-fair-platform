import { prisma } from "@/lib/prisma";
import { createNotification } from "@/app/data/notifications";

/** Resolve a display name for any role by User.id. */
async function getActorName(userId: string): Promise<string> {
  const [artist, gallery, curator] = await Promise.all([
    prisma.artistProfile.findUnique({ where: { userId }, select: { name: true } }),
    prisma.galleryProfile.findUnique({ where: { userId }, select: { name: true } }),
    prisma.curatorProfile.findUnique({ where: { userId }, select: { name: true } }),
  ]);
  return artist?.name ?? gallery?.name ?? curator?.name ?? "Someone";
}

type ArtworkNotifyKind = "like" | "collab" | "comment";

/** Notify the owner of an artwork about engagement. Non-blocking; never throws. */
export async function notifyArtworkOwner(input: {
  artworkId: string;
  actorUserId: string;
  kind: ArtworkNotifyKind;
  commentPreview?: string;
}): Promise<void> {
  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id: input.artworkId },
      select: { id: true, artist: { select: { userId: true, artistId: true } } },
    });
    const ownerUserId = artwork?.artist?.userId;
    if (!ownerUserId || ownerUserId === input.actorUserId) return;

    const actorName = await getActorName(input.actorUserId);
    const link = `/artist/public/${encodeURIComponent(artwork!.artist!.artistId)}`;

    const preview = (input.commentPreview || "").trim().slice(0, 80);
    const config = {
      like: {
        type: "artwork_like" as const,
        title: "새 좋아요",
        message: `${actorName}님이 회원님의 작업에 좋아요를 눌렀습니다.`,
      },
      collab: {
        type: "artwork_collab" as const,
        title: "콜라보 관심",
        message: `${actorName}님이 회원님의 작업에 콜라보 관심을 표시했습니다.`,
      },
      comment: {
        type: "artwork_comment" as const,
        title: "새 댓글",
        message: preview ? `${actorName}: ${preview}` : `${actorName}님이 댓글을 남겼습니다.`,
      },
    }[input.kind];

    await createNotification({
      userId: ownerUserId,
      type: config.type,
      title: config.title,
      message: config.message,
      link,
      data: { artworkId: artwork!.id },
    });
  } catch (e) {
    console.error("notifyArtworkOwner failed (non-blocking):", e);
  }
}

/** Notify an artist that someone followed them. `followingProfileId` is ArtistProfile.id. */
export async function notifyNewFollower(input: {
  followingProfileId: string;
  actorUserId: string;
}): Promise<void> {
  try {
    const profile = await prisma.artistProfile.findUnique({
      where: { id: input.followingProfileId },
      select: { userId: true, artistId: true },
    });
    if (!profile?.userId || profile.userId === input.actorUserId) return;

    const actorName = await getActorName(input.actorUserId);
    await createNotification({
      userId: profile.userId,
      type: "new_follower",
      title: "새 팔로워",
      message: `${actorName}님이 회원님을 팔로우하기 시작했습니다.`,
      link: `/artist/public/${encodeURIComponent(profile.artistId)}`,
    });
  } catch (e) {
    console.error("notifyNewFollower failed (non-blocking):", e);
  }
}

/** Notify a moment owner that someone reacted. */
export async function notifyMomentReaction(input: {
  momentOwnerUserId: string;
  actorUserId: string;
  reactionType: string;
}): Promise<void> {
  try {
    if (!input.momentOwnerUserId || input.momentOwnerUserId === input.actorUserId) return;
    const actorName = await getActorName(input.actorUserId);
    await createNotification({
      userId: input.momentOwnerUserId,
      type: "moment_reaction",
      title: "작업 기록 반응",
      message: `${actorName}님이 회원님의 작업 기록에 반응했습니다.`,
      link: "/artist/ritual",
    });
  } catch (e) {
    console.error("notifyMomentReaction failed (non-blocking):", e);
  }
}
