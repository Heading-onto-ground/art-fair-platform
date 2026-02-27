import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const where = { userId: session.userId, readAt: null };
  const [unreadCount, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, type: true, payload: true, createdAt: true } }),
  ]);
  return NextResponse.json({ unreadCount, items });
}
export async function PATCH() {
  const session = getServerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  await prisma.notification.updateMany({ where: { userId: session.userId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
