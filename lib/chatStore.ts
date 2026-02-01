// lib/chatStore.ts
// MVP: file-based chat store (dev only)
// - runtime: nodejs (Route Handler에서 fs 사용)
// - 데이터는 /data/chat.json 에 저장

import fs from "fs/promises";
import path from "path";

export type Role = "artist" | "gallery";

export type Participant = {
  userId: string;
  role: Role;
};

export type Room = {
  id: string;
  participants: Participant[];
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: Role;
  text: string;
  createdAt: number;
};

type DB = {
  rooms: Record<string, Room>;
  messagesByRoom: Record<string, Message[]>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "chat.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const empty: DB = { rooms: {}, messagesByRoom: {} };
    await fs.writeFile(DATA_FILE, JSON.stringify(empty, null, 2), "utf-8");
  }
}

async function readDB(): Promise<DB> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw || "{}");
  return {
    rooms: parsed.rooms ?? {},
    messagesByRoom: parsed.messagesByRoom ?? {},
  };
}

async function writeDB(db: DB) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function uniqParticipants(list: Participant[]) {
  const map = new Map<string, Participant>();
  for (const p of list) {
    map.set(`${p.role}:${p.userId}`, p);
  }
  return Array.from(map.values());
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const db = await readDB();
  return db.rooms[roomId] ?? null;
}

export async function ensureRoom(roomId: string, me: Participant): Promise<Room> {
  const db = await readDB();
  const now = Date.now();

  const existing = db.rooms[roomId];
  if (!existing) {
    const room: Room = {
      id: roomId,
      participants: [me],
      createdAt: now,
      updatedAt: now,
    };
    db.rooms[roomId] = room;
    db.messagesByRoom[roomId] = db.messagesByRoom[roomId] ?? [];
    await writeDB(db);
    return room;
  }

  // 참가자 갱신
  const participants = uniqParticipants([...(existing.participants ?? []), me]);
  const updated: Room = {
    ...existing,
    participants,
    updatedAt: now,
  };
  db.rooms[roomId] = updated;
  db.messagesByRoom[roomId] = db.messagesByRoom[roomId] ?? [];
  await writeDB(db);
  return updated;
}

export async function listMessages(roomId: string): Promise<Message[]> {
  const db = await readDB();
  return db.messagesByRoom[roomId] ?? [];
}

export async function addMessage(input: {
  roomId: string;
  senderId: string;
  senderRole: Role;
  text: string;
}): Promise<Message> {
  const db = await readDB();
  const now = Date.now();

  // 방/메시지 배열 보장
  db.rooms[input.roomId] =
    db.rooms[input.roomId] ??
    ({
      id: input.roomId,
      participants: [],
      createdAt: now,
      updatedAt: now,
    } as Room);

  db.messagesByRoom[input.roomId] = db.messagesByRoom[input.roomId] ?? [];

  const msg: Message = {
    id: `msg_${now}_${Math.random().toString(16).slice(2)}`,
    roomId: input.roomId,
    senderId: input.senderId,
    senderRole: input.senderRole,
    text: input.text,
    createdAt: now,
  };

  db.messagesByRoom[input.roomId].push(msg);

  // room.updatedAt 갱신
  db.rooms[input.roomId] = {
    ...db.rooms[input.roomId],
    updatedAt: now,
  };

  await writeDB(db);
  return msg;
}
