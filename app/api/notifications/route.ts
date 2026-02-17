import { NextResponse } from "next/server";
import { getProfileByUserId, getServerSession } from "@/lib/auth";
import {
  listNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/data/notifications";

export const dynamic = "force-dynamic";

async function getNotificationAliases(session: { userId: string; email?: string }) {
  const profile = await getProfileByUserId(session.userId);
  const ids = new Set<string>();
  if (session.userId) ids.add(session.userId);
  if (session.email) ids.add(session.email);
  if (profile && (profile as any).role === "gallery") {
    const p = profile as any;
    if (p.galleryId) ids.add(String(p.galleryId));
    if (p.name) ids.add(String(p.name));
  }
  return ids;
}

// GET: 알림 목록 조회
export async function GET() {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const aliases = await getNotificationAliases(session);
    const list = await Promise.all(Array.from(aliases).map((id) => listNotificationsByUser(id)));
    const notifications = list
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((n, idx, arr) => arr.findIndex((x) => x.id === n.id) === idx)
      .slice(0, 50);
    const unreadCount = notifications.filter((n) => !n.read).length;

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
      const aliases = await getNotificationAliases(session);
      for (const id of aliases) {
        await markAllNotificationsAsRead(id);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/notifications failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
