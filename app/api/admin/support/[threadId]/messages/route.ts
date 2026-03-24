import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/adminAuth";
import {
  addAdminMessage,
  getThreadForAdmin,
  listMessagesForThread,
  readByRecipientForSupportMessage,
  validateSupportText,
} from "@/lib/adminSupport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function handlePrismaFailure(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021" || e.code === "P2010") {
      return NextResponse.json(
        {
          ok: false,
          error: "schema_missing",
          message:
            "DB에 쪽지 테이블이 없습니다. 프로덕션 DB에 `npx prisma db push`를 실행하세요.",
        },
        { status: 503 }
      );
    }
  }
  console.error("GET admin support messages failed:", e);
  return NextResponse.json({ error: "server error" }, { status: 500 });
}

export async function GET(
  _req: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const threadId = params.threadId;
    const thread = await getThreadForAdmin(threadId);
    if (!thread) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const messages = await listMessagesForThread(threadId);
    type Row = (typeof messages)[number];

    await prisma.adminSupportThread.update({
      where: { id: threadId },
      data: { lastReadByAdminAt: new Date() },
    });
    const fresh = await prisma.adminSupportThread.findUnique({
      where: { id: threadId },
      select: { lastReadByUserAt: true, lastReadByAdminAt: true },
    });
    const lur = fresh?.lastReadByUserAt ?? null;
    const lar = fresh?.lastReadByAdminAt ?? null;

    return NextResponse.json({
      ok: true,
      thread: {
        id: thread.id,
        userId: thread.userId,
        userEmail: thread.user.email,
        userRole: thread.user.role,
      },
      messages: messages.map((m: Row) => ({
        id: m.id,
        fromAdmin: m.fromAdmin,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        readByRecipient: readByRecipientForSupportMessage(m.fromAdmin, m.createdAt, lur, lar),
      })),
    });
  } catch (e) {
    return handlePrismaFailure(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const threadId = params.threadId;
    const thread = await getThreadForAdmin(threadId);
    if (!thread) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text : "";
    const err = validateSupportText(text);
    if (err === "empty") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    if (err === "too_long") {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    const msg = await addAdminMessage(threadId, text.trim());

    return NextResponse.json({
      ok: true,
      message: {
        id: msg.id,
        fromAdmin: msg.fromAdmin,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
        readByRecipient: false,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021" || e.code === "P2010") {
        return NextResponse.json(
          {
            ok: false,
            error: "schema_missing",
            message: "DB에 쪽지 테이블이 없습니다. `npx prisma db push`를 실행하세요.",
          },
          { status: 503 }
        );
      }
    }
    console.error("POST admin support messages failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
