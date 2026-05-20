import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import {
  createRejectedArtistTestimony,
  listMyRejectedArtistTestimonies,
  listPublishedRejectedArtistTestimonies,
} from "@/lib/rejectedArtists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine") === "1";
    const limitRaw = Number(url.searchParams.get("limit") || (mine ? "50" : "30"));
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : mine ? 50 : 30;

    if (mine) {
      const session = getServerSession();
      if (!session || session.role !== "artist") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const testimonies = await listMyRejectedArtistTestimonies(session.userId, limit);
      return NextResponse.json({ ok: true, testimonies }, { status: 200 });
    }

    const testimonies = await listPublishedRejectedArtistTestimonies(limit);
    return NextResponse.json({ ok: true, testimonies }, { status: 200 });
  } catch (e) {
    console.error("GET /api/rejected-artists failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "artist_only" }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.userId);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ error: "artist_profile_required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const title = sanitizeText(String(body?.title || ""), 140);
    const content = sanitizeText(String(body?.content || ""), 5000);
    const workLinks = sanitizeText(String(body?.workLinks || ""), 2000);
    const rejectionContext = sanitizeText(String(body?.rejectionContext || ""), 600);
    const emotion = sanitizeText(String(body?.emotion || ""), 300);

    if (!title || !content) {
      return NextResponse.json({ error: "title_content_required" }, { status: 400 });
    }

    const testimony = await createRejectedArtistTestimony({
      userId: session.userId,
      artistId: String(profile.artistId || ""),
      artistName: String(profile.name || ""),
      title,
      content,
      workLinks: workLinks || null,
      rejectionContext: rejectionContext || null,
      emotion: emotion || null,
    });

    return NextResponse.json({ ok: true, testimony }, { status: 200 });
  } catch (e) {
    console.error("POST /api/rejected-artists failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
