import { NextResponse } from "next/server";
import { createOpenCall, listOpenCalls } from "@/app/data/openCalls";
import { getServerSession } from "@/lib/auth";
import {
  getOpenCallValidationMap,
  isOpenCallDeadlineActive,
  shouldHideOpenCallByValidation,
} from "@/lib/openCallValidation";

function normalizeCountry(input: string) {
  const v = String(input || "").trim();
  if (!v) return v;
  const compact = v.replace(/\s+/g, "").toLowerCase();
  if (compact === "대한민국" || compact === "한국" || compact === "southkorea" || compact === "republicofkorea") {
    return "한국";
  }
  return v;
}

function normalizeCity(input: string) {
  const v = String(input || "").trim();
  if (!v) return v;
  const lower = v.toLowerCase();
  if (lower === "seould" || lower === "seoul d") return "Seoul";
  return v;
}

export async function GET() {
  const allOpenCalls = await listOpenCalls();
  let validationMap = new Map<string, { status?: string; reason?: string | null }>();
  try {
    validationMap = await getOpenCallValidationMap(allOpenCalls.map((oc) => oc.id));
  } catch (validationError) {
    // Validation lookup is best-effort; keep API available on infra mismatch.
    console.error("open-call validation map load failed (non-blocking):", validationError);
  }
  const openCalls = allOpenCalls
    .filter((oc) => {
      if (!isOpenCallDeadlineActive(String(oc.deadline || ""))) return false;
      // Only hide clearly invalid external entries. Keep internal and temporary-unreachable entries visible.
      const validation = validationMap.get(oc.id);
      if (!oc.isExternal) return true;
      return !shouldHideOpenCallByValidation(validation);
    })
    .map((oc) => ({
    ...oc,
    country: normalizeCountry(oc.country),
    city: normalizeCity(oc.city),
  }));
  const res = NextResponse.json({ openCalls });
  res.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=120");
  return res;
}

export async function POST(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "gallery") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { gallery, city, country, theme, deadline, exhibitionDate, posterImage } = body ?? {};

  if (!gallery || !city || !country || !theme || !exhibitionDate || !deadline) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const normalizedCountry = normalizeCountry(String(country).trim());
  const allowedCountries = new Set(["한국", "일본", "영국", "프랑스", "미국", "독일", "이탈리아", "중국", "스위스", "호주"]);
  if (!allowedCountries.has(normalizedCountry)) {
    return NextResponse.json({ error: "invalid country" }, { status: 400 });
  }

  try {
    const created = await createOpenCall({
      galleryId: session.userId,
      gallery: String(gallery).trim(),
      city: normalizeCity(String(city).trim()),
      country: normalizedCountry,
      theme: String(theme).trim(),
      deadline: String(deadline).trim(),
      exhibitionDate: String(exhibitionDate || "").trim() || undefined,
      posterImage: posterImage && typeof posterImage === "string" && posterImage.startsWith("data:image/") ? posterImage : undefined,
    });

    return NextResponse.json({ openCall: created }, { status: 201 });
  } catch (e: any) {
    if (String(e?.message).includes("already exists")) {
      return NextResponse.json({ error: "open call exists for country" }, { status: 400 });
    }
    throw e;
  }
}