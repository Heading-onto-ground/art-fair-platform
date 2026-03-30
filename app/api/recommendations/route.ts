import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { listOpenCalls } from "@/app/data/openCalls";
import { listApplicationsByArtist } from "@/app/data/applications";
import { matchArtistToOpenCalls } from "@/lib/matcher";
import {
  getOpenCallValidationMap,
  isOpenCallDeadlineActive,
  shouldHideOpenCallByValidation,
} from "@/lib/openCallValidation";
import { getPinnedOpenCallGalleryId, getPinnedOpenCallId } from "@/lib/adminSettings";

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
        if (!isOpenCallDeadlineActive(String(oc.deadline || ""))) return false;
        const validation = validationMap.get(oc.id);
        if (oc.isExternal && shouldHideOpenCallByValidation(validation)) return false;
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

    const profileWithGenre = profile as { genre?: unknown };
    const genre = typeof profileWithGenre.genre === "string" ? profileWithGenre.genre : "";
    const profileTips: string[] = [];
    if (!profile.country) profileTips.push("Add your country for stronger local matching");
    if (!profile.city) profileTips.push("Add your city to prioritize nearby opportunities");
    if (!genre) profileTips.push("Set your main genre to improve theme matching");
    if (!profile.bio) profileTips.push("Write a short bio so galleries can understand your practice");
    const artist = {
      userId: session.userId,
      name: profile.name ?? "",
      genre,
      country: profile.country ?? "",
      city: profile.city ?? "",
    };

    const matched = matchArtistToOpenCalls(
      {
        ...artist,
      },
      openCalls,
      appliedIds
    );

    const pinnedOpenCallId = await getPinnedOpenCallId();
    const pinnedGalleryId = pinnedOpenCallId ? null : await getPinnedOpenCallGalleryId(); // legacy fallback

    const pinnedOpenCall = pinnedOpenCallId ? openCalls.find((oc) => oc.id === pinnedOpenCallId) || null : null;
    const pinnedMatched = pinnedOpenCall ? matchArtistToOpenCalls(artist, [pinnedOpenCall], new Set())?.[0] || null : null;

    const recommendations = (
      pinnedMatched
        ? [pinnedMatched, ...matched.filter((m) => m.id !== pinnedMatched.id)]
        : pinnedGalleryId
          ? [...matched.filter((m) => m.galleryId === pinnedGalleryId), ...matched.filter((m) => m.galleryId !== pinnedGalleryId)]
          : matched
    ).slice(0, 5);

    const nextDeadline = recommendations
      .map((r) => ({ id: r.id, deadline: r.deadline, ms: new Date(r.deadline).getTime() - Date.now() }))
      .filter((r) => Number.isFinite(r.ms) && r.ms > 0)
      .sort((a, b) => a.ms - b.ms)[0];

    return NextResponse.json({
      recommendations,
      totalAvailable: openCalls.filter((oc) => !appliedIds.has(oc.id)).length,
      profileTips,
      nextAction:
        nextDeadline
          ? {
              type: "deadline",
              openCallId: nextDeadline.id,
              deadline: nextDeadline.deadline,
              daysLeft: Math.max(1, Math.ceil(nextDeadline.ms / (1000 * 60 * 60 * 24))),
            }
          : null,
    });
  } catch (e) {
    console.error("GET /api/recommendations failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
