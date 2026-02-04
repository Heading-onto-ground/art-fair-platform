import { NextResponse } from "next/server";
import { createChatRoom, listRoomsByArtist, listRoomsByGallery, getMessages } from "@/lib/chat";
import { getOpenCallById } from "@/app/data/openCalls";
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

    // 각 방의 마지막 메시지 정보 추가
    const items = await Promise.all(
      rooms.map(async (r) => {
        const messages = await getMessages(r.id);
        const lastMsg = messages[messages.length - 1];
        return {
          id: r.id,
          openCallId: r.openCallId,
          artistId: r.artistId,
          galleryId: r.galleryId,
          lastMessageAt: lastMsg?.createdAt ?? null,
          lastMessageText: lastMsg?.text ?? null,
        };
      })
    );

    // 최신 대화가 위로 오게 정렬
    items.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ rooms: items });
  } catch (e) {
    console.error("GET /api/chat failed:", e);
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

    const roomId = await createChatRoom(openCallId, session.userId, galleryId);
    return NextResponse.json({ roomId }, { status: 200 });
  } catch (e) {
    console.error("POST /api/chat failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
