import type { ShortlistStatus } from "@/lib/pro/shortlistPolicy";
import { prisma } from "@/lib/prisma";
import { loadPublicDiscoveryGraph } from "@/lib/pro/discoveryQuery";
import {
  addToShortlist,
  changeShortlistStatus,
  deletePrivateNote,
  isShortlistStatus,
  notePreview,
  pageShortlist,
  readPrivateNote,
  removeFromShortlist,
  savePrivateNote,
  shortlistPublicFacts,
  type NoteRow,
  type PublicSpace,
  type ShortlistRow,
  type ShortlistStore,
} from "@/lib/pro/shortlistPolicy";

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

function shortlistRow(row: {
  id: string;
  userId: string;
  artistEntityId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ShortlistRow {
  return {
    id: row.id,
    userId: row.userId,
    artistEntityId: row.artistEntityId,
    status: isShortlistStatus(row.status) ? row.status : "REVIEW",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function noteRow(row: {
  id: string;
  userId: string;
  artistEntityId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}): NoteRow {
  return row;
}

const store: ShortlistStore = {
  async findShortlist(userId, artistEntityId) {
    const row = await prisma.artistShortlist.findUnique({
      where: { userId_artistEntityId: { userId, artistEntityId } },
    });
    return row ? shortlistRow(row) : null;
  },
  async createShortlist(row) {
    const created = await prisma.artistShortlist.create({ data: row });
    return shortlistRow(created);
  },
  async updateStatus(userId, artistEntityId, status, now) {
    const result = await prisma.artistShortlist.updateMany({
      where: { userId, artistEntityId },
      data: { status, updatedAt: now },
    });
    if (result.count === 0) return null;
    const updated = await prisma.artistShortlist.findFirst({ where: { userId, artistEntityId } });
    return updated ? shortlistRow(updated) : null;
  },
  async deleteShortlist(userId, artistEntityId) {
    const result = await prisma.artistShortlist.deleteMany({ where: { userId, artistEntityId } });
    return result.count;
  },
  async listShortlists(userId) {
    const rows = await prisma.artistShortlist.findMany({ where: { userId } });
    return rows.map(shortlistRow);
  },
  async findNote(userId, artistEntityId) {
    const row = await prisma.privateArtistNote.findFirst({ where: { userId, artistEntityId } });
    return row ? noteRow(row) : null;
  },
  async saveNote(row) {
    const existing = await prisma.privateArtistNote.findFirst({
      where: { userId: row.userId, artistEntityId: row.artistEntityId },
      select: { id: true },
    });
    if (!existing) {
      try {
        const created = await prisma.privateArtistNote.create({ data: row });
        return { row: noteRow(created), created: true };
      } catch (error) {
        if (!isUnique(error)) throw error;
      }
    }
    await prisma.privateArtistNote.updateMany({
      where: { userId: row.userId, artistEntityId: row.artistEntityId },
      data: { body: row.body, updatedAt: row.updatedAt },
    });
    const updated = await prisma.privateArtistNote.findFirst({
      where: { userId: row.userId, artistEntityId: row.artistEntityId },
    });
    if (!updated) return { row, created: false };
    return { row: noteRow(updated), created: false };
  },
  async deleteNote(userId, artistEntityId) {
    const result = await prisma.privateArtistNote.deleteMany({ where: { userId, artistEntityId } });
    return result.count;
  },
  async listNotes(userId, artistEntityIds) {
    if (artistEntityIds.length === 0) return [];
    const rows = await prisma.privateArtistNote.findMany({
      where: { userId, artistEntityId: { in: artistEntityIds } },
    });
    return rows.map(noteRow);
  },
};

export type ShortlistListItem = {
  id: string;
  artistEntityId: string;
  slug: string | null;
  canonicalName: string | null;
  nativeName: string | null;
  status: ShortlistStatus;
  exhibitionCount: number;
  latestActivityLabel: string | null;
  latestExhibitionTitle: string | null;
  spaces: PublicSpace[];
  noteBody: string | null;
  notePreview: string | null;
  createdAt: string;
  updatedAt: string;
  available: boolean;
};

export async function addArtistShortlist(userId: string, artistEntityId: string) {
  try {
    return await addToShortlist(store, userId, artistEntityId);
  } catch (error) {
    if (!isUnique(error)) throw error;
    const existing = await store.findShortlist(userId, artistEntityId);
    if (!existing) throw error;
    return { created: false as const, row: existing };
  }
}

export async function setShortlistStatus(userId: string, artistEntityId: string, status: unknown) {
  return changeShortlistStatus(store, userId, artistEntityId, status);
}

export async function removeArtistShortlist(userId: string, artistEntityId: string) {
  return removeFromShortlist(store, userId, artistEntityId);
}

export async function readArtistNote(userId: string, artistEntityId: string) {
  return readPrivateNote(store, userId, artistEntityId);
}

export async function writeArtistNote(userId: string, artistEntityId: string, body: unknown) {
  return savePrivateNote(store, userId, artistEntityId, body);
}

export async function removeArtistNote(userId: string, artistEntityId: string) {
  return deletePrivateNote(store, userId, artistEntityId);
}

export async function shortlistedArtistIds(userId: string, artistEntityIds: string[]): Promise<Set<string>> {
  if (artistEntityIds.length === 0) return new Set<string>();
  const rows = await prisma.artistShortlist.findMany({
    where: { userId, artistEntityId: { in: artistEntityIds } },
    select: { artistEntityId: true },
  });
  const ids: string[] = [];
  for (const row of rows as { artistEntityId: string }[]) ids.push(row.artistEntityId);
  return new Set(ids);
}

export async function listShortlistPage(userId: string, cursor: string | null) {
  const [rows, graph] = await Promise.all([store.listShortlists(userId), loadPublicDiscoveryGraph()]);
  const prepared = rows.map((row) => {
    const facts = shortlistPublicFacts(graph, row.artistEntityId);
    return {
      updatedAt: row.updatedAt.toISOString(),
      canonicalName: facts.canonicalName,
      id: row.id,
      row,
      facts,
    };
  });
  const paged = pageShortlist(prepared, cursor);
  if (!paged.ok) return paged;
  const notes = await store.listNotes(
    userId,
    paged.items.map((item) => item.row.artistEntityId),
  );
  const byArtist = new Map(notes.map((note) => [note.artistEntityId, note.body]));
  const items: ShortlistListItem[] = paged.items.map((item) => {
    const body = byArtist.get(item.row.artistEntityId) ?? null;
    return {
      id: item.row.id,
      artistEntityId: item.row.artistEntityId,
      slug: item.facts.slug,
      canonicalName: item.facts.canonicalName,
      nativeName: item.facts.nativeName,
      status: item.row.status,
      exhibitionCount: item.facts.exhibitionCount,
      latestActivityLabel: item.facts.latestActivityLabel,
      latestExhibitionTitle: item.facts.latestExhibitionTitle,
      spaces: item.facts.spaces,
      noteBody: body,
      notePreview: notePreview(body),
      createdAt: item.row.createdAt.toISOString(),
      updatedAt: item.updatedAt,
      available: item.facts.available,
    };
  });
  return { ok: true as const, items, nextCursor: paged.nextCursor, total: paged.total };
}

export function artistPathKey(raw: string | undefined): string {
  const value = raw ?? "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}
