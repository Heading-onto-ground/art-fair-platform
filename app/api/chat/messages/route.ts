import { NextResponse } from "next/server";
import { canAccessRoom, getMessages } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId") || "";

    if (!roomId) {
      return NextResponse.json({ error: "missing roomId" }, { status: 400 });
    }

    // MVP auth: 헤더로 받기
    const userId = req.headers.get("x-user-id") || "";
    const role = req.headers.get("x-user-role") || "";

    if (!userId || !role) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 권한 체크
    if (!canAccessRoom(roomId, userId, role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const msgs = getMessages(roomId);
    return NextResponse.json(msgs);
  } catch (e) {
    console.error("GET /api/chat/messages failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
