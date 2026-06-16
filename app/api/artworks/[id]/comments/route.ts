import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addArtworkComment, listArtworkComments } from "@/lib/artworkEngagement";

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

  const comments = await listArtworkComments(params.id);
  return NextResponse.json({ comments });
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
  const text = typeof body.body === "string" ? body.body : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  try {
    const comment = await addArtworkComment(params.id, session.userId, text);
    return NextResponse.json({ ok: true, comment });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
