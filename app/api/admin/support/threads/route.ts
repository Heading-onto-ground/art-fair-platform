import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/adminAuth";
import { addAdminMessage, getOrCreateThread, listThreadsForAdmin, validateSupportText } from "@/lib/adminSupport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const BROADCAST_BATCH_SIZE = 300;

type PlatformRole = "artist" | "gallery" | "curator";
type BroadcastUserRow = {
  id: string;
  email: string;
  role: PlatformRole;
};

function normalizeRoles(input: unknown): PlatformRole[] {
  const arr = Array.isArray(input) ? input : [];
  const roles = arr
    .map((v) => String(v || "").trim().toLowerCase())
    .filter((v): v is PlatformRole => v === "artist" || v === "gallery" || v === "curator");
  if (roles.length > 0) return Array.from(new Set(roles));
  return ["artist", "gallery", "curator"];
}

function isExcludedSupportAccount(email: string) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return true;
  if (e.includes("@invalid.local")) return true;
  if (e.includes(".bot@rob-roleofbridge.com")) return true;
  return false;
}

async function sendBroadcastSupportMessage(text: string, roles: PlatformRole[]) {
  const users: BroadcastUserRow[] = await prisma.user.findMany({
    where: { role: { in: roles } as any },
    select: { id: true, email: true, role: true },
  });
  const targets = users.filter((u: BroadcastUserRow) => !isExcludedSupportAccount(u.email));
  if (targets.length === 0) {
    return { total: 0, sent: 0, roles };
  }

  const threadIds: string[] = [];
  for (const target of targets) {
    const thread = await prisma.adminSupportThread.upsert({
      where: { userId: target.id },
      update: {},
      create: { userId: target.id },
      select: { id: true },
    });
    threadIds.push(thread.id);
  }

  let sent = 0;
  for (let i = 0; i < threadIds.length; i += BROADCAST_BATCH_SIZE) {
    const batch = threadIds.slice(i, i + BROADCAST_BATCH_SIZE);
    const created = await prisma.adminSupportMessage.createMany({
      data: batch.map((threadId) => ({
        threadId,
        fromAdmin: true,
        text,
      })),
    });
    sent += created.count;
  }
  await prisma.adminSupportThread.updateMany({
    where: { id: { in: threadIds } },
    data: { updatedAt: new Date() },
  });

  return { total: targets.length, sent, roles };
}

async function sendSelectedSupportMessage(text: string, userIds: string[]) {
  const cleanedIds = Array.from(new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (cleanedIds.length === 0) return { total: 0, sent: 0, threadIds: [] as string[] };

  const users: BroadcastUserRow[] = await prisma.user.findMany({
    where: { id: { in: cleanedIds } },
    select: { id: true, email: true, role: true },
  });
  const targets = users.filter((u: BroadcastUserRow) => !isExcludedSupportAccount(u.email));
  if (targets.length === 0) return { total: 0, sent: 0, threadIds: [] as string[] };

  const threadIds: string[] = [];
  for (const target of targets) {
    const thread = await prisma.adminSupportThread.upsert({
      where: { userId: target.id },
      update: {},
      create: { userId: target.id },
      select: { id: true },
    });
    threadIds.push(thread.id);
  }

  let sent = 0;
  for (let i = 0; i < threadIds.length; i += BROADCAST_BATCH_SIZE) {
    const batch = threadIds.slice(i, i + BROADCAST_BATCH_SIZE);
    const created = await prisma.adminSupportMessage.createMany({
      data: batch.map((threadId) => ({
        threadId,
        fromAdmin: true,
        text,
      })),
    });
    sent += created.count;
  }
  await prisma.adminSupportThread.updateMany({
    where: { id: { in: threadIds } },
    data: { updatedAt: new Date() },
  });

  return { total: targets.length, sent, threadIds };
}

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
  console.error("/api/admin/support/threads failed:", e);
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

export async function POST(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const targetMode = String(body?.targetMode || "single").trim().toLowerCase();
    const userId = String(body?.userId || "").trim();
    const userEmail = String(body?.userEmail || "")
      .trim()
      .toLowerCase();
    const text = typeof body?.text === "string" ? body.text : "";

    const err = validateSupportText(text);
    if (err === "empty") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    if (err === "too_long") {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    if (targetMode === "broadcast") {
      const roles = normalizeRoles(body?.roles);
      const result = await sendBroadcastSupportMessage(text.trim(), roles);
      if (result.total === 0) {
        return NextResponse.json({ error: "no users resolved" }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        targetMode: "broadcast",
        total: result.total,
        sent: result.sent,
        roles: result.roles,
      });
    }

    if (targetMode === "selected") {
      const userIds = Array.isArray(body?.userIds) ? body.userIds : [];
      const result = await sendSelectedSupportMessage(text.trim(), userIds);
      if (result.total === 0) {
        return NextResponse.json({ error: "no users resolved" }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        targetMode: "selected",
        total: result.total,
        sent: result.sent,
        threadId: result.threadIds.length === 1 ? result.threadIds[0] : null,
      });
    }

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "userId or userEmail required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: userId
        ? { id: userId }
        : {
            email: userEmail,
          },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const thread = await getOrCreateThread(user.id);
    const message = await addAdminMessage(thread.id, text.trim());
    await prisma.adminSupportThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      thread: {
        id: thread.id,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
      },
      message: {
        id: message.id,
        fromAdmin: message.fromAdmin,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (e) {
    return handlePrismaFailure(e);
  }
}
