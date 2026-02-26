import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const likes = await prisma.communityLike.findMany({ where: { postId: params.id }, select: { userId: true } });
  const userIds = likes.map((l: { userId: string }) => l.userId);
  if (!userIds.length) return NextResponse.json({ names: [] });

  const [artists, galleries] = await Promise.all([
    prisma.artistProfile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, name: true } }),
    prisma.galleryProfile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, name: true } }),
  ]);
  const nameMap: Record<string, string> = {};
  [...artists, ...galleries].forEach((p) => { nameMap[p.userId] = p.name; });
  const names = userIds.map((id) => nameMap[id] || "Unknown");
  return NextResponse.json({ names });
}
