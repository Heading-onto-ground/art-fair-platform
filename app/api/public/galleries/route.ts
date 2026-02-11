import { NextResponse } from "next/server";
import { listGalleryProfiles } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const galleries = await listGalleryProfiles();
    const res = NextResponse.json({ galleries }, { status: 200 });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    return res;
  } catch (e) {
    console.error("GET /api/public/galleries failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
