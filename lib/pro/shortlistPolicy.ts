import { DISCOVERY_PAGE_SIZE, DISCOVERY_SPACE_CAP, type DiscoveryGraph } from "@/lib/pro/discoveryPolicy";
import { artistPublicActivity, type WatchFacts } from "@/lib/pro/privatePolicy";
import { DEFAULT_SHORTLIST_STATUS, isShortlistStatus, NOTE_MAX_LENGTH, NOTE_PREVIEW_LENGTH, type ShortlistStatus } from "@/lib/pro/shortlistStatus";

/** Shortlist is a review state. It is not a watch and not a private note. */
export const SHORTLIST_PAGE_SIZE = DISCOVERY_PAGE_SIZE;

export {
  DEFAULT_SHORTLIST_STATUS,
  isShortlistStatus,
  NOTE_MAX_LENGTH,
  NOTE_PREVIEW_LENGTH,
  SHORTLIST_STATUSES,
  STATUS_LABELS,
  type ShortlistStatus,
} from "@/lib/pro/shortlistStatus";

export const SHORTLIST_ITEM_KEYS = [
  "id",
  "artistEntityId",
  "slug",
  "canonicalName",
  "nativeName",
  "status",
  "exhibitionCount",
  "latestActivityLabel",
  "latestExhibitionTitle",
  "spaces",
  "notePreview",
  "createdAt",
  "updatedAt",
  "available",
] as const;

export type ShortlistRow = {
  id: string;
  userId: string;
  artistEntityId: string;
  status: ShortlistStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteRow = {
  id: string;
  userId: string;
  artistEntityId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface ShortlistStore {
  findShortlist(userId: string, artistEntityId: string): Promise<ShortlistRow | null>;
  createShortlist(row: ShortlistRow): Promise<ShortlistRow>;
  updateStatus(userId: string, artistEntityId: string, status: ShortlistStatus, now: Date): Promise<ShortlistRow | null>;
  deleteShortlist(userId: string, artistEntityId: string): Promise<number>;
  listShortlists(userId: string): Promise<ShortlistRow[]>;
  findNote(userId: string, artistEntityId: string): Promise<NoteRow | null>;
  saveNote(row: NoteRow): Promise<{ row: NoteRow; created: boolean }>;
  deleteNote(userId: string, artistEntityId: string): Promise<number>;
  listNotes(userId: string, artistEntityIds: string[]): Promise<NoteRow[]>;
}

export type PublicSpace = { name: string; slug: string | null; count: number };

export type ShortlistFacts = WatchFacts & { spaces: PublicSpace[] };

export type NoteValidation =
  | { ok: true; body: string }
  | { ok: false; error: "empty_body" | "body_too_long" | "invalid_body" };

export function parseObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function hasUnknownField(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(record).some((key) => !allowed.includes(key));
}

/** Stores the trimmed characters. Markup is not interpreted or removed. */
export function validateNoteBody(value: unknown): NoteValidation {
  if (typeof value !== "string") return { ok: false, error: "invalid_body" };
  const body = value.trim();
  if (!body) return { ok: false, error: "empty_body" };
  if ([...body].length > NOTE_MAX_LENGTH) return { ok: false, error: "body_too_long" };
  return { ok: true, body };
}

export function notePreview(body: string | null | undefined): string | null {
  if (!body) return null;
  const chars = [...body];
  if (chars.length <= NOTE_PREVIEW_LENGTH) return body;
  return chars.slice(0, NOTE_PREVIEW_LENGTH).join("");
}

export function shortlistPublicFacts(graph: DiscoveryGraph, artistId: string): ShortlistFacts {
  const base = artistPublicActivity(graph, artistId);
  if (!base.available) return { ...base, spaces: [] };
  const spaces = new Map<string, PublicSpace & { id: string }>();
  for (const exhibition of graph.exhibitions) {
    if (!exhibition.artistIds.includes(artistId) || !exhibition.spaceId || !exhibition.spaceName) continue;
    const current = spaces.get(exhibition.spaceId) ?? {
      id: exhibition.spaceId,
      name: exhibition.spaceName,
      slug: exhibition.spaceSlug,
      count: 0,
    };
    current.count += 1;
    spaces.set(exhibition.spaceId, current);
  }
  return {
    ...base,
    spaces: [...spaces.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"))
      .slice(0, DISCOVERY_SPACE_CAP)
      .map(({ name, slug, count }) => ({ name, slug, count })),
  };
}

export type ShortlistSortable = { updatedAt: string; canonicalName: string | null; id: string };

export function compareShortlist(a: ShortlistSortable, b: ShortlistSortable): number {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
  const name = (a.canonicalName ?? "").localeCompare(b.canonicalName ?? "", "ko");
  if (name) return name;
  return a.id.localeCompare(b.id);
}

type CursorKey = { u: string; n: string; i: string };

export function encodeShortlistCursor(item: ShortlistSortable): string {
  return Buffer.from(JSON.stringify({ u: item.updatedAt, n: item.canonicalName ?? "", i: item.id }), "utf8").toString("base64url");
}

export function decodeShortlistCursor(cursor: string): CursorKey | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<CursorKey>;
    if (!parsed || typeof parsed.u !== "string" || typeof parsed.n !== "string" || typeof parsed.i !== "string") return null;
    if (!parsed.u || !parsed.i) return null;
    return { u: parsed.u, n: parsed.n, i: parsed.i };
  } catch {
    return null;
  }
}

export function pageShortlist<T extends ShortlistSortable>(items: readonly T[], cursor: string | null, pageSize = SHORTLIST_PAGE_SIZE) {
  if (cursor) {
    const key = decodeShortlistCursor(cursor);
    if (!key) return { ok: false as const, error: "invalid_cursor" as const };
    const ordered = [...items].sort(compareShortlist);
    const after = ordered.filter((item) => compareShortlist({ updatedAt: key.u, canonicalName: key.n, id: key.i }, item) < 0);
    const slice = after.slice(0, pageSize);
    return {
      ok: true as const,
      items: slice,
      total: ordered.length,
      nextCursor: after.length > pageSize && slice.length > 0 ? encodeShortlistCursor(slice[slice.length - 1]) : null,
    };
  }
  const ordered = [...items].sort(compareShortlist);
  const slice = ordered.slice(0, pageSize);
  return {
    ok: true as const,
    items: slice,
    total: ordered.length,
    nextCursor: ordered.length > pageSize && slice.length > 0 ? encodeShortlistCursor(slice[slice.length - 1]) : null,
  };
}

export async function addToShortlist(store: ShortlistStore, userId: string, artistEntityId: string, now = new Date()) {
  const existing = await store.findShortlist(userId, artistEntityId);
  if (existing) return { created: false as const, row: existing };
  const row = await store.createShortlist({
    id: crypto.randomUUID(),
    userId,
    artistEntityId,
    status: DEFAULT_SHORTLIST_STATUS,
    createdAt: now,
    updatedAt: now,
  });
  return { created: true as const, row };
}

export async function changeShortlistStatus(
  store: ShortlistStore,
  userId: string,
  artistEntityId: string,
  status: unknown,
  now = new Date(),
) {
  if (!isShortlistStatus(status)) return { ok: false as const, error: "invalid_status" as const };
  const row = await store.updateStatus(userId, artistEntityId, status, now);
  if (!row) return { ok: false as const, error: "not_found" as const };
  return { ok: true as const, row };
}

export async function removeFromShortlist(store: ShortlistStore, userId: string, artistEntityId: string) {
  const count = await store.deleteShortlist(userId, artistEntityId);
  return count > 0 ? ("removed" as const) : ("missing" as const);
}

export async function readPrivateNote(store: ShortlistStore, userId: string, artistEntityId: string) {
  return store.findNote(userId, artistEntityId);
}

export async function savePrivateNote(
  store: ShortlistStore,
  userId: string,
  artistEntityId: string,
  body: unknown,
  now = new Date(),
) {
  const validated = validateNoteBody(body);
  if (!validated.ok) return validated;
  const existing = await store.findNote(userId, artistEntityId);
  const saved = await store.saveNote({
    id: existing?.id ?? crypto.randomUUID(),
    userId,
    artistEntityId,
    body: validated.body,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  return { ok: true as const, created: saved.created, row: saved.row };
}

export async function deletePrivateNote(store: ShortlistStore, userId: string, artistEntityId: string) {
  const count = await store.deleteNote(userId, artistEntityId);
  return count > 0 ? ("deleted" as const) : ("missing" as const);
}
