import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getArtworkEngagement,
  toggleArtworkLike,
  toggleArtworkCollabInterest,
} from "@/lib/artworkEngagement";
import { notifyArtworkOwner } from "@/lib/engagementNotifications";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: params.id },
    select: { id: true, isPublic: true },
  });
  if (!artwork || !artwork.isPublic) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const session = getServerSession();
  const engagement = await getArtworkEngagement(params.id, session?.userId);
  return NextResponse.json(engagement);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const artwork = await prisma.artwork.findUnique({
    where: { id: params.id },
    select: { id: true, isPublic: true },
  });
  if (!artwork || !artwork.isPublic) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "like") {
      const engagement = await toggleArtworkLike(params.id, session.userId);
      if (engagement.liked) {
        await notifyArtworkOwner({ artworkId: params.id, actorUserId: session.userId, kind: "like" });
      }
      return NextResponse.json({ ok: true, engagement });
    }
    if (action === "collab") {
      const engagement = await toggleArtworkCollabInterest(params.id, session.userId);
      if (engagement.collabInterested) {
        await notifyArtworkOwner({ artworkId: params.id, actorUserId: session.userId, kind: "collab" });
      }
      return NextResponse.json({ ok: true, engagement });
    }
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (e) {
    console.error("POST artwork engagement failed:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
