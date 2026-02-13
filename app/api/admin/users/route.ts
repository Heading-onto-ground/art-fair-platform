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

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const rows = await prisma.user.findMany({
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

    const users: AdminUserRow[] = rows.map((u) => {
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

