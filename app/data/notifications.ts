import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "new_application"
  | "application_accepted"
  | "application_rejected"
  | "new_message"
  | "shipment_update"
  | "recommendation"
  | "deadline_reminder"
  | "gallery_outreach";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: number;
};

function toNotif(row: any): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    link: row.link ?? undefined,
    data: row.data as Record<string, any> | undefined,
    read: row.read,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
  };
}

export async function listNotificationsByUser(userId: string): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toNotif);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
}): Promise<Notification> {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      data: input.data ? (input.data as any) : undefined,
    },
  });
  return toNotif(row);
}

export async function markNotificationAsRead(id: string): Promise<Notification | null> {
  try {
    const row = await prisma.notification.update({ where: { id }, data: { read: true } });
    return toNotif(row);
  } catch {
    return null;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function deleteNotification(id: string): Promise<boolean> {
  try {
    await prisma.notification.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
