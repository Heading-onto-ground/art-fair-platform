import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { listOpenCalls } from "@/app/data/openCalls";
import { listApplicationsByArtist } from "@/app/data/applications";
import { getTopRecommendations } from "@/lib/matcher";
import { getOpenCallValidationMap } from "@/lib/openCallValidation";

export const dynamic = "force-dynamic";

function normalizeCity(input: string) {
  const v = String(input || "").trim();
  if (!v) return v;
  const lower = v.toLowerCase();
  if (lower === "seould" || lower === "seoul d") return "Seoul";
  return v;
}

function normalizeCountry(input: string) {
  const v = String(input || "").trim();
  if (!v) return v;
  const compact = v.replace(/\s+/g, "").toLowerCase();
  if (compact === "대한민국" || compact === "한국" || compact === "southkorea" || compact === "republicofkorea") {
    return "한국";
  }
  return v;
}

function shouldHideByValidation(validation?: { status?: string; reason?: string | null }) {
  if (!validation || validation.status !== "invalid") return false;
  const reason = String(validation.reason || "").toLowerCase();
  if (reason === "missing_or_invalid_url") return true;
  if (reason.startsWith("http_")) return true;
  return false;
}

function isLikelyGarbageGalleryName(name: string) {
  const v = String(name || "").trim();
  if (!v) return true;
  if (v.length < 2) return true;
  // Catch random token-like names such as I2rd32fe.
  if (/^[a-z][0-9][a-z0-9]{5,}$/i.test(v)) return true;
  if (/^[a-z0-9]{8,}$/i.test(v) && !/[aeiou]/i.test(v)) return true;
  return false;
}

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

    const openCallsRaw = await listOpenCalls();
    const validationMap = await getOpenCallValidationMap(openCallsRaw.map((oc) => oc.id));
    const openCalls = openCallsRaw
      .filter((oc) => {
        const validation = validationMap.get(oc.id);
        if (oc.isExternal && shouldHideByValidation(validation)) return false;
        if (isLikelyGarbageGalleryName(oc.gallery)) return false;
        return true;
      })
      .map((oc) => ({
        ...oc,
        country: normalizeCountry(oc.country),
        city: normalizeCity(oc.city),
      }));
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
