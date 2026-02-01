import { NextResponse } from "next/server";
import { listGalleryProfiles } from "@/lib/auth";

export async function GET() {
  try {
    const galleries = await listGalleryProfiles();
    return NextResponse.json({ galleries }, { status: 200 });
  } catch (e) {
    console.error("GET /api/public/galleries failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
