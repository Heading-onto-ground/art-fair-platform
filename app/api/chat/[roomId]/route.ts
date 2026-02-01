import { NextResponse } from "next/server";
import { canAccessRoom, getMessages, getRoom } from "@/lib/chat";

type Role = "artist" | "gallery";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

async function getSessionFromMe(req: Request) {
  // 같은 오리진에서 /api/auth/me 호출하면서, 원래 쿠키를 그대로 전달
  const url = new URL("/api/auth/me", req.url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      cookie: req.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as MeResponse | null;
  return data?.session ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;

    // ✅ 헤더가 아니라 세션으로 판독
    const session = await getSessionFromMe(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "room not found" }, { status: 404 });
    }

    const ok = canAccessRoom(roomId, session.userId, session.role);
    if (!ok) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const messages = getMessages(roomId);
    return NextResponse.json({
      messages,
      room: {
        id: room.id,
        openCallId: room.openCallId,
        artistId: room.artistId,
        galleryId: room.galleryId,
      },
    });
  } catch (e) {
    console.error("GET /api/chat/[roomId] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}