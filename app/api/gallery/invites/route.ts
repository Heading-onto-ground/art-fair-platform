import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { listInvitesByGallery } from "@/app/data/invites";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const invites = listInvitesByGallery(session.userId);
    return NextResponse.json({ invites }, { status: 200 });
  } catch (e) {
    console.error("GET /api/gallery/invites failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
