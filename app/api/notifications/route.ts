import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const where = { userId: session.userId, read: false };
    const [unreadCount, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, title: true, message: true, link: true, data: true, createdAt: true },
      }),
    ]);
    return NextResponse.json({ unreadCount, items: items.map(i => ({ ...i, payload: i.data })) });
  } catch {
    return NextResponse.json({ unreadCount: 0, items: [] });
  }
}

export async function POST(req: Request) {
  const session = getServerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const { action, notificationId } = await req.json().catch(() => ({}));
    if (action === "mark_read" && notificationId) {
      await prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

export async function PATCH() {
  const session = getServerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await prisma.notification.updateMany({ where: { userId: session.userId, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
