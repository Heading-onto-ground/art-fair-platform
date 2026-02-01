export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
};

export type ChatRoom = {
  id: string;
  openCallId: string;
  artistId: string;
  galleryId: string;
  messages: Message[];
};

// 🔹 메모리 DB (MVP)
const rooms: ChatRoom[] = [];

export function createChatRoom(openCallId: string, artistId: string, galleryId: string) {
  const existing = rooms.find((r) => r.openCallId === openCallId && r.artistId === artistId);
  if (existing) return existing.id;

  const room: ChatRoom = {
    id: `room_${Date.now()}`,
    openCallId,
    artistId,
    galleryId,
    messages: [],
  };

  rooms.push(room);
  return room.id;
}

export function hasChatRoom(openCallId: string, artistId: string) {
  return rooms.some((r) => r.openCallId === openCallId && r.artistId === artistId);
}

export function listRoomsByArtist(artistId: string) {
  return rooms.filter((r) => r.artistId === artistId);
}

export function listRoomsByGallery(galleryId: string) {
  return rooms.filter((r) => r.galleryId === galleryId);
}

export function getRoom(roomId: string) {
  return rooms.find((r) => r.id === roomId);
}

export function canAccessRoom(roomId: string, userId: string, role: string) {
  const room = getRoom(roomId);
  if (!room) return false;

  const isArtist = role === "artist" && userId === room.artistId;
  const isGallery = role === "gallery" && userId === room.galleryId;

  return isArtist || isGallery;
}

export function getMessages(roomId: string): Message[] {
  const room = getRoom(roomId);
  return room?.messages ?? [];
}

export function sendMessage(roomId: string, senderId: string, text: string) {
  const room = getRoom(roomId);
  if (!room) return;

  room.messages.push({
    id: Date.now().toString(),
    senderId,
    text,
    createdAt: Date.now(),
  });
}