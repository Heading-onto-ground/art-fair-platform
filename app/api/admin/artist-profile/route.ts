import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const profile = await prisma.artistProfile.findUnique({
    where: { userId },
  });
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { userId, action, message } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (action === "clear-portfolio") {
    await prisma.artistProfile.update({ where: { userId }, data: { portfolioUrl: null } });
    await prisma.notification.create({
      data: {
        userId,
        type: "admin_action",
        payload: {
          title: "포트폴리오가 삭제되었습니다",
          message: message || "관리자에 의해 포트폴리오가 삭제되었습니다.",
        },
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
