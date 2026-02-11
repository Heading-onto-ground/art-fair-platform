import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { listOpenCalls } from "@/app/data/openCalls";
import { listApplicationsByArtist } from "@/app/data/applications";
import { getTopRecommendations } from "@/lib/matcher";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.userId);
    if (!profile) {
      return NextResponse.json({ recommendations: [], message: "Complete your profile for personalized recommendations" });
    }

    const openCalls = await listOpenCalls();
    const applications = await listApplicationsByArtist(session.userId);
    const appliedIds = new Set(applications.map((a) => a.openCallId));

    const genre = "genre" in profile ? (profile as any).genre ?? "" : "";
    const recommendations = getTopRecommendations(
      {
        userId: session.userId,
        name: profile.name ?? "",
        genre,
        country: profile.country ?? "",
        city: profile.city ?? "",
      },
      openCalls,
      appliedIds,
      5
    );

    return NextResponse.json({
      recommendations,
      totalAvailable: openCalls.filter((oc) => !appliedIds.has(oc.id) && new Date(oc.deadline).getTime() > Date.now()).length,
    });
  } catch (e) {
    console.error("GET /api/recommendations failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
