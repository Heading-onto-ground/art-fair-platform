import { NextResponse } from "next/server";
import { canAccessRoom, getMessages } from "@/lib/chat";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId") || "";

    if (!roomId) {
      return NextResponse.json({ error: "missing roomId" }, { status: 400 });
    }

    // 세션 기반 인증
    const session = await getSessionFromMe(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 권한 체크
    const ok = await canAccessRoom(roomId, session.userId, session.role);
    if (!ok) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const msgs = await getMessages(roomId);
    return NextResponse.json(msgs);
  } catch (e) {
    console.error("GET /api/chat/messages failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
