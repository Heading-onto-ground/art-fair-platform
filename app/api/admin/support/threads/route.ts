import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { listThreadsForAdmin } from "@/lib/adminSupport";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const threads = await listThreadsForAdmin();
    const needingReply = threads.filter((t) => t.lastMessage && !t.lastMessage.fromAdmin).length;

    return NextResponse.json({
      ok: true,
      threads: threads.map((t) => ({
        id: t.id,
        userId: t.userId,
        userEmail: t.userEmail,
        userRole: t.userRole,
        updatedAt: t.updatedAt.toISOString(),
        lastMessage: t.lastMessage
          ? {
              text: t.lastMessage.text.slice(0, 200),
              fromAdmin: t.lastMessage.fromAdmin,
              createdAt: t.lastMessage.createdAt.toISOString(),
            }
          : null,
      })),
      threadsNeedingReply: needingReply,
    });
  } catch (e) {
    console.error("GET /api/admin/support/threads failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
