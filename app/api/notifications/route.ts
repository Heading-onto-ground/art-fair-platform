import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  listNotificationsByUser,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/data/notifications";

export const dynamic = "force-dynamic";

// GET: 알림 목록 조회
export async function GET() {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const notifications = await listNotificationsByUser(session.userId);
    const unreadCount = await countUnreadNotifications(session.userId);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (e) {
    console.error("GET /api/notifications failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// POST: 알림 읽음 처리
export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, notificationId } = body;

    if (action === "mark_read" && notificationId) {
      const updated = await markNotificationAsRead(notificationId);
      return NextResponse.json({ ok: true, notification: updated });
    }

    if (action === "mark_all_read") {
      await markAllNotificationsAsRead(session.userId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/notifications failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
