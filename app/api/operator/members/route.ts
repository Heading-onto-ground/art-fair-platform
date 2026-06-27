import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/operatorAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  email: string;
  role: "artist" | "gallery" | "curator";
  createdAt: Date;
  artistProfile: { name: string; country: string | null; city: string | null; artistId: string } | null;
  galleryProfile: { name: string; country: string | null; city: string | null; galleryId: string } | null;
  curatorProfile: { name: string; country: string | null; city: string | null; curatorId: string } | null;
};

/** Read-only member list for operators. No emails of bots, no destructive actions. */
export async function GET() {
  const ctx = await getOperatorContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      artistProfile: { select: { name: true, country: true, city: true, artistId: true } },
      galleryProfile: { select: { name: true, country: true, city: true, galleryId: true } },
      curatorProfile: { select: { name: true, country: true, city: true, curatorId: true } },
    },
  }) as Row[];

  const members = rows
    .filter((u) => !u.email.includes("@invalid.local") && !u.email.includes(".bot@rob-roleofbridge.com"))
    .map((u) => {
      const p = u.artistProfile ?? u.galleryProfile ?? u.curatorProfile;
      return {
        id: u.id,
        role: u.role,
        name: p?.name ?? "-",
        location: [p?.city, p?.country].filter(Boolean).join(", "),
        joined: u.createdAt.getTime(),
      };
    });

  return NextResponse.json({
    members,
    stats: {
      total: members.length,
      artists: members.filter((m) => m.role === "artist").length,
      galleries: members.filter((m) => m.role === "gallery").length,
      curators: members.filter((m) => m.role === "curator").length,
    },
  });
}
