import { NextResponse } from "next/server";
import { listRoomsByArtist, listRoomsByGallery } from "@/lib/chat";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const rooms =
      session.role === "artist"
        ? await listRoomsByArtist(session.userId)
        : await listRoomsByGallery(session.userId);

    return NextResponse.json({ rooms });
  } catch (e) {
    console.error("GET /api/chats failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
