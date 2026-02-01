import { NextResponse } from "next/server";
import { createOpenCall, listOpenCalls } from "@/app/data/openCalls";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ openCalls: listOpenCalls() });
}

export async function POST(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "gallery") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { gallery, city, country, theme, deadline } = body ?? {};

  if (!gallery || !city || !country || !theme || !deadline) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const allowedCountries = new Set(["한국", "일본", "영국"]);
  if (!allowedCountries.has(String(country).trim())) {
    return NextResponse.json({ error: "invalid country" }, { status: 400 });
  }

  try {
    const created = createOpenCall({
      galleryId: session.userId,
      gallery: String(gallery).trim(),
      city: String(city).trim(),
      country: String(country).trim(),
      theme: String(theme).trim(),
      deadline: String(deadline).trim(),
    });

    return NextResponse.json({ openCall: created }, { status: 201 });
  } catch (e: any) {
    if (String(e?.message).includes("already exists")) {
      return NextResponse.json({ error: "open call exists for country" }, { status: 400 });
    }
    throw e;
  }
}