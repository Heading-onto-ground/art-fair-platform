import { NextResponse } from "next/server";
import { sendMessage, getRoom, canAccessRoom } from "@/lib/chat";

type Role = "artist" | "gallery";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

async function getSessionFromMe(req: Request) {
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { roomId, text } = (body ?? {}) as { roomId?: string; text?: string };

    if (!roomId || !text?.trim()) {
      return NextResponse.json(
        { error: "missing roomId/text" },
        { status: 400 }
      );
    }

    // ✅ 세션 판독 (클라 입력 senderId 금지)
    const session = await getSessionFromMe(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // ✅ room 존재 체크
    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "room not found" }, { status: 404 });
    }

    // ✅ 접근권한 체크 (전송도 룸 접근 가능해야)
    const ok = canAccessRoom(roomId, session.userId, session.role);
    if (!ok) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    sendMessage(roomId, session.userId, text.trim());

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/send failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}