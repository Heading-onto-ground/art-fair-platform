import { NextResponse } from "next/server";
import { listArtistProfiles } from "@/lib/auth";

export async function GET() {
  try {
    const artists = await listArtistProfiles();
    const res = NextResponse.json({ artists }, { status: 200 });
    // Cache for 30s, serve stale for 5min while revalidating
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    return res;
  } catch (e) {
    console.error("GET /api/public/artists failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
