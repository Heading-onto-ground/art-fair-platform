import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/adminAuth";
import { listThreadsForAdmin } from "@/lib/adminSupport";

export const dynamic = "force-dynamic";

function handlePrismaFailure(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021" || e.code === "P2010") {
      return NextResponse.json(
        {
          ok: false,
          error: "schema_missing",
          message:
            "DB에 쪽지 테이블이 없습니다. Supabase 포트 6543(Pooler)로는 db push가 안 될 수 있습니다. (1) Supabase → SQL Editor에서 저장소의 prisma/sql/create-admin-support-tables.sql 전체를 붙여넣어 실행하거나, (2) Supabase → Database Settings에서 Direct connection(보통 포트 5432) URI로 DATABASE_URL을 잡고 로컬에서 npx prisma db push 하세요.",
        },
        { status: 503 }
      );
    }
  }
  console.error("GET /api/admin/support/threads failed:", e);
  return NextResponse.json({ error: "server error" }, { status: 500 });
}

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
    return handlePrismaFailure(e);
  }
}
