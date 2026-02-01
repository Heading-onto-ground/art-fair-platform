import { NextResponse } from "next/server";
import { listArtistProfiles } from "@/lib/auth";

export async function GET() {
  try {
    const artists = await listArtistProfiles();
    return NextResponse.json({ artists }, { status: 200 });
  } catch (e) {
    console.error("GET /api/public/artists failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
