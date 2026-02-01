import { NextResponse } from "next/server";
import { createChatRoom, listRoomsByArtist, listRoomsByGallery } from "@/lib/chat";
import { getOpenCallById } from "@/app/data/openCalls";
import { getServerSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const rooms =
      session.role === "artist"
        ? listRoomsByArtist(session.userId)
        : listRoomsByGallery(session.userId);

    // ✅ 최소한의 정보만 내려주기 (messages 전체는 무거우니까)
    const items = rooms.map((r) => ({
      id: r.id,
      openCallId: r.openCallId,
      artistId: r.artistId,
      galleryId: r.galleryId,
      lastMessageAt: r.messages.length
        ? r.messages[r.messages.length - 1].createdAt
        : null,
      lastMessageText: r.messages.length
        ? r.messages[r.messages.length - 1].text
        : null,
    }));

    // 최신 대화가 위로 오게 정렬
    items.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

    return NextResponse.json({ rooms: items });
  } catch (e) {
    console.error("GET /api/chats failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (session.role !== "artist") {
      return NextResponse.json({ error: "only artists can create chats" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const openCallId = String(body?.openCallId ?? "").trim();
    const galleryId = String(body?.galleryId ?? "").trim();

    if (!openCallId || !galleryId) {
      return NextResponse.json({ error: "missing openCallId/galleryId" }, { status: 400 });
    }

    const openCall = getOpenCallById(openCallId);
    if (!openCall) {
      return NextResponse.json({ error: "open call not found" }, { status: 404 });
    }

    if (openCall.galleryId !== galleryId) {
      return NextResponse.json({ error: "gallery mismatch" }, { status: 400 });
    }

    const roomId = createChatRoom(openCallId, session.userId, galleryId);
    return NextResponse.json({ roomId }, { status: 200 });
  } catch (e) {
    console.error("POST /api/chat failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}