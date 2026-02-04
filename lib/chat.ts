// lib/chat.ts
// DB-based chat (Prisma)

import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type Message = {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: Role;
  text: string;
  createdAt: Date;
};

export type ChatRoom = {
  id: string;
  artistId: string;
  galleryId: string;
  openCallId: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
};

/** 채팅방 생성 또는 기존 방 반환 */
export async function createChatRoom(
  openCallId: string | null,
  artistId: string,
  galleryId: string
): Promise<string> {
  const existing = await prisma.chatRoom.findFirst({
    where: { artistId, galleryId, openCallId },
  });
  if (existing) return existing.id;

  const room = await prisma.chatRoom.create({
    data: { artistId, galleryId, openCallId },
  });
  return room.id;
}

/** 채팅방 존재 여부 확인 */
export async function hasChatRoom(
  openCallId: string | null,
  artistId: string
): Promise<boolean> {
  const room = await prisma.chatRoom.findFirst({
    where: { artistId, openCallId },
  });
  return !!room;
}

/** 아티스트의 채팅방 목록 */
export async function listRoomsByArtist(artistId: string): Promise<ChatRoom[]> {
  return prisma.chatRoom.findMany({
    where: { artistId },
    orderBy: { updatedAt: "desc" },
  });
}

/** 갤러리의 채팅방 목록 */
export async function listRoomsByGallery(galleryId: string): Promise<ChatRoom[]> {
  return prisma.chatRoom.findMany({
    where: { galleryId },
    orderBy: { updatedAt: "desc" },
  });
}

/** 채팅방 조회 */
export async function getRoom(roomId: string): Promise<ChatRoom | null> {
  return prisma.chatRoom.findUnique({
    where: { id: roomId },
  });
}

/** 채팅방 접근 권한 확인 */
export async function canAccessRoom(
  roomId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const room = await getRoom(roomId);
  if (!room) return false;

  if (role === "artist") return userId === room.artistId;
  if (role === "gallery") return userId === room.galleryId;
  return false;
}

/** 메시지 목록 조회 */
export async function getMessages(roomId: string): Promise<Message[]> {
  return prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
  });
}

/** 메시지 전송 */
export async function sendMessage(
  roomId: string,
  senderId: string,
  senderRole: Role,
  text: string
): Promise<Message> {
  // 메시지 생성
  const msg = await prisma.message.create({
    data: { roomId, senderId, senderRole, text },
  });

  // 채팅방 updatedAt 갱신
  await prisma.chatRoom.update({
    where: { id: roomId },
    data: { updatedAt: new Date() },
  });

  return msg;
}

/** userId로 채팅방 목록 조회 (role에 따라) */
export async function listRoomsByUser(
  userId: string,
  role: string
): Promise<ChatRoom[]> {
  if (role === "artist") {
    return listRoomsByArtist(userId);
  } else if (role === "gallery") {
    return listRoomsByGallery(userId);
  }
  return [];
}
