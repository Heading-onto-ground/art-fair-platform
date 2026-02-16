import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type AdminUserRow = {
  id: string;
  email: string;
  role: "artist" | "gallery";
  createdAt: number;
  name: string;
  country: string;
  city: string;
  profileId: string;
};

type UserWithProfiles = {
  id: string;
  email: string;
  role: "artist" | "gallery";
  createdAt: Date;
  artistProfile: {
    artistId: string;
    name: string;
    country: string | null;
    city: string | null;
  } | null;
  galleryProfile: {
    galleryId: string;
    name: string;
    country: string | null;
    city: string | null;
  } | null;
};

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const rows: UserWithProfiles[] = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        artistProfile: {
          select: {
            artistId: true,
            name: true,
            country: true,
            city: true,
          },
        },
        galleryProfile: {
          select: {
            galleryId: true,
            name: true,
            country: true,
            city: true,
          },
        },
      },
    });

    const users: AdminUserRow[] = rows.map((u: UserWithProfiles) => {
      const isArtist = u.role === "artist";
      const p = isArtist ? u.artistProfile : u.galleryProfile;
      return {
        id: u.id,
        email: u.email,
        role: u.role as "artist" | "gallery",
        createdAt: u.createdAt.getTime(),
        name: p?.name ?? "-",
        country: p?.country ?? "",
        city: p?.city ?? "",
        profileId: isArtist
          ? (u.artistProfile?.artistId ?? "")
          : (u.galleryProfile?.galleryId ?? ""),
      };
    });

    const stats = {
      total: users.length,
      artists: users.filter((u) => u.role === "artist").length,
      galleries: users.filter((u) => u.role === "gallery").length,
      withProfile: users.filter((u) => u.name !== "-").length,
    };

    return NextResponse.json({ users, stats }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/users failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.map((v: unknown) => String(v || "").trim()).filter(Boolean)
      : [];

    if (userIds.length === 0) {
      return NextResponse.json({ error: "userIds required" }, { status: 400 });
    }
    if (userIds.length > 200) {
      return NextResponse.json({ error: "too many users at once (max 200)" }, { status: 400 });
    }

    // Safety guard: if a platform user exists with same email as current admin, don't delete it.
    const protectedUser = await prisma.user.findFirst({
      where: { email: admin.email.toLowerCase().trim() },
      select: { id: true },
    });
    const safeIds = protectedUser
      ? userIds.filter((id: string) => id !== protectedUser.id)
      : userIds;

    if (safeIds.length === 0) {
      return NextResponse.json({ ok: true, deletedUsers: 0, skippedProtected: userIds.length });
    }

    const [
      deletedNotifications,
      deletedCommunityLikes,
      deletedCommunityComments,
      deletedCommunityPosts,
      deletedMessagesBySender,
      deletedChatRooms,
      deletedOpenCalls,
      deletedApplications,
      deletedArtistProfiles,
      deletedGalleryProfiles,
      deletedUsers,
    ] = await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: { in: safeIds } } }),
      prisma.communityLike.deleteMany({ where: { userId: { in: safeIds } } }),
      prisma.communityComment.deleteMany({ where: { authorId: { in: safeIds } } }),
      prisma.communityPost.deleteMany({ where: { authorId: { in: safeIds } } }),
      prisma.message.deleteMany({ where: { senderId: { in: safeIds } } }),
      prisma.chatRoom.deleteMany({
        where: {
          OR: [{ artistId: { in: safeIds } }, { galleryId: { in: safeIds } }],
        },
      }),
      prisma.openCall.deleteMany({ where: { galleryId: { in: safeIds } } }),
      prisma.application.deleteMany({
        where: {
          OR: [{ artistId: { in: safeIds } }, { galleryId: { in: safeIds } }],
        },
      }),
      prisma.artistProfile.deleteMany({ where: { userId: { in: safeIds } } }),
      prisma.galleryProfile.deleteMany({ where: { userId: { in: safeIds } } }),
      prisma.user.deleteMany({ where: { id: { in: safeIds } } }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        requested: userIds.length,
        deletedUsers: deletedUsers.count,
        deletedNotifications: deletedNotifications.count,
        deletedCommunityLikes: deletedCommunityLikes.count,
        deletedCommunityComments: deletedCommunityComments.count,
        deletedCommunityPosts: deletedCommunityPosts.count,
        deletedMessagesBySender: deletedMessagesBySender.count,
        deletedChatRooms: deletedChatRooms.count,
        deletedOpenCalls: deletedOpenCalls.count,
        deletedApplications: deletedApplications.count,
        deletedArtistProfiles: deletedArtistProfiles.count,
        deletedGalleryProfiles: deletedGalleryProfiles.count,
        skippedProtected: userIds.length - safeIds.length,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("DELETE /api/admin/users failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

