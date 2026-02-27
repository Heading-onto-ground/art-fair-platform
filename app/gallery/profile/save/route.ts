import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = getServerSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (session.role !== "gallery") {
      return NextResponse.json({ ok: false, error: "gallery only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({} as any));
    await prisma.galleryProfile.updateMany({ where: { userId: session.userId }, data: { notify_new_community_post: Boolean(body.notify_new_community_post) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/gallery/profile/save failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
