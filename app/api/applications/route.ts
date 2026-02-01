import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { getOpenCallById, listOpenCallsByGallery } from "@/app/data/openCalls";
import {
  createApplication,
  findApplication,
  listApplicationsByArtist,
  listApplicationsByOpenCall,
} from "@/app/data/applications";

export async function GET(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const openCallId = searchParams.get("openCallId");

    if (session.role === "artist") {
      const mine = listApplicationsByArtist(session.userId);
      return NextResponse.json({
        applications: openCallId
          ? mine.filter((a) => a.openCallId === openCallId)
          : mine,
      });
    }

    if (session.role === "gallery") {
      if (openCallId) {
        const openCall = getOpenCallById(openCallId);
        if (!openCall || openCall.galleryId !== session.userId) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        return NextResponse.json({
          applications: listApplicationsByOpenCall(openCallId),
        });
      }

      const galleryOpenCalls = listOpenCallsByGallery(session.userId);
      const all: any[] = [];
      for (const oc of galleryOpenCalls) {
        const list = listApplicationsByOpenCall(oc.id);
        for (const app of list) all.push(app);
      }
      return NextResponse.json({ applications: all });
    }

    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  } catch (e) {
    console.error("GET /api/applications failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const openCallId = String(body?.openCallId ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!openCallId) {
      return NextResponse.json({ error: "missing openCallId" }, { status: 400 });
    }

    const openCall = getOpenCallById(openCallId);
    if (!openCall) {
      return NextResponse.json({ error: "open call not found" }, { status: 404 });
    }

    const existing = findApplication(openCallId, session.userId);
    if (existing) {
      return NextResponse.json({ application: existing }, { status: 200 });
    }

    const profile = await getProfileByUserId(session.userId);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json(
        { error: "artist profile required" },
        { status: 400 }
      );
    }
    if (!profile.portfolioUrl) {
      return NextResponse.json(
        { error: "portfolio required" },
        { status: 400 }
      );
    }

    const created = createApplication({
      openCallId,
      galleryId: openCall.galleryId,
      artistId: session.userId,
      artistName: profile.name ?? session.userId,
      artistEmail: profile.email ?? session.userId,
      artistCountry: profile.country ?? "",
      artistCity: profile.city ?? "",
      artistPortfolioUrl: profile.portfolioUrl,
      message: message || undefined,
    });

    return NextResponse.json({ application: created }, { status: 201 });
  } catch (e) {
    console.error("POST /api/applications failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
