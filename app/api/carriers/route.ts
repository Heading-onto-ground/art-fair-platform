import { NextResponse } from "next/server";
import { getCarriersByCountry, ALL_CARRIERS } from "@/lib/carriers";

export const dynamic = "force-dynamic";

// GET /api/carriers?country=한국
export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = url.searchParams.get("country");

  if (country) {
    const carriers = getCarriersByCountry(country);
    return NextResponse.json({ ok: true, carriers });
  }

  return NextResponse.json({ ok: true, carriers: ALL_CARRIERS });
}
