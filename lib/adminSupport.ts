import { prisma } from "@/lib/prisma";

const MAX_LEN = 8000;

export function validateSupportText(text: string): string | null {
  const t = text.trim();
  if (!t) return "empty";
  if (t.length > MAX_LEN) return "too_long";
  return null;
}

/** id만 사용 — DB에 읽음 컬럼이 아직 없어도 SELECT가 실패하지 않도록 */
export async function getOrCreateThread(userId: string): Promise<{ id: string }> {
  const existing = await prisma.adminSupportThread.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.adminSupportThread.create({
    data: { userId },
    select: { id: true },
  });
}

export async function listMessagesForThread(threadId: string) {
  return prisma.adminSupportMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });
}

export async function addUserMessage(userId: string, text: string) {
  const thread = await getOrCreateThread(userId);
  return prisma.adminSupportMessage.create({
    data: { threadId: thread.id, fromAdmin: false, text },
  });
}

export async function addAdminMessage(threadId: string, text: string) {
  return prisma.adminSupportMessage.create({
    data: { threadId, fromAdmin: true, text },
  });
}

export type ThreadListItem = {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  updatedAt: Date;
  lastMessage: { text: string; fromAdmin: boolean; createdAt: Date } | null;
};

export async function listThreadsForAdmin(): Promise<ThreadListItem[]> {
  const threads = await prisma.adminSupportThread.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userId: true,
      updatedAt: true,
      user: { select: { email: true, role: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, fromAdmin: true, createdAt: true },
      },
    },
  });

  type ThreadRow = (typeof threads)[number];
  return threads.map((t: ThreadRow) => ({
    id: t.id,
    userId: t.userId,
    userEmail: t.user.email,
    userRole: t.user.role,
    updatedAt: t.updatedAt,
    lastMessage: t.messages[0] ?? null,
  }));
}

export async function getThreadForAdmin(threadId: string) {
  return prisma.adminSupportThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      userId: true,
      user: { select: { email: true, role: true } },
    },
  });
}

/** 읽음 컬럼이 아직 없으면 조용히 실패 (readByRecipient는 전부 false) */
export async function tryRefreshReadReceiptsAfterUserOpen(threadId: string): Promise<{
  lastReadByUserAt: Date | null;
  lastReadByAdminAt: Date | null;
}> {
  try {
    await prisma.adminSupportThread.update({
      where: { id: threadId },
      data: { lastReadByUserAt: new Date() },
    });
    const fresh = await prisma.adminSupportThread.findUnique({
      where: { id: threadId },
      select: { lastReadByUserAt: true, lastReadByAdminAt: true },
    });
    return {
      lastReadByUserAt: fresh?.lastReadByUserAt ?? null,
      lastReadByAdminAt: fresh?.lastReadByAdminAt ?? null,
    };
  } catch {
    return { lastReadByUserAt: null, lastReadByAdminAt: null };
  }
}

export async function tryRefreshReadReceiptsAfterAdminOpen(threadId: string): Promise<{
  lastReadByUserAt: Date | null;
  lastReadByAdminAt: Date | null;
}> {
  try {
    await prisma.adminSupportThread.update({
      where: { id: threadId },
      data: { lastReadByAdminAt: new Date() },
    });
    const fresh = await prisma.adminSupportThread.findUnique({
      where: { id: threadId },
      select: { lastReadByUserAt: true, lastReadByAdminAt: true },
    });
    return {
      lastReadByUserAt: fresh?.lastReadByUserAt ?? null,
      lastReadByAdminAt: fresh?.lastReadByAdminAt ?? null,
    };
  } catch {
    return { lastReadByUserAt: null, lastReadByAdminAt: null };
  }
}

/** 상대(수신자)가 이 메시지를 읽었는지 — 스레드의 lastRead 타임스탬프 기준 */
export function readByRecipientForSupportMessage(
  fromAdmin: boolean,
  messageCreatedAt: Date,
  lastReadByUserAt: Date | null,
  lastReadByAdminAt: Date | null
): boolean {
  const t = messageCreatedAt.getTime();
  if (fromAdmin) {
    return !!(lastReadByUserAt && lastReadByUserAt.getTime() >= t);
  }
  return !!(lastReadByAdminAt && lastReadByAdminAt.getTime() >= t);
}
