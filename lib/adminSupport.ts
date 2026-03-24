import { prisma } from "@/lib/prisma";

const MAX_LEN = 8000;

export function validateSupportText(text: string): string | null {
  const t = text.trim();
  if (!t) return "empty";
  if (t.length > MAX_LEN) return "too_long";
  return null;
}

export async function getOrCreateThread(userId: string) {
  const existing = await prisma.adminSupportThread.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return prisma.adminSupportThread.create({
    data: { userId },
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
    include: {
      user: { select: { email: true, role: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, fromAdmin: true, createdAt: true },
      },
    },
  });

  return threads.map((t) => ({
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
    include: { user: { select: { email: true, role: true } } },
  });
}
