import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { isHistoryEvent } from "@/lib/history/policy";
import { buildDiscoveryGraph, type DiscoveryEntityRow, type DiscoveryExhibitionRow } from "@/lib/pro/discoveryPolicy";
import { unwatchArtist, watchArtist, type PrivateStore, type SearchRow, type WatchRow } from "@/lib/pro/privatePolicy";
import {
  addToShortlist,
  changeShortlistStatus,
  deletePrivateNote,
  notePreview,
  pageShortlist,
  removeFromShortlist,
  savePrivateNote,
  SHORTLIST_ITEM_KEYS,
  SHORTLIST_PAGE_SIZE,
  validateNoteBody,
  type NoteRow,
  type ShortlistRow,
  type ShortlistStore,
} from "@/lib/pro/shortlistPolicy";

const requireUserSession = vi.fn();
const enforceRateLimit = vi.fn();
const resolveArtistEntity = vi.fn();
const addArtistShortlist = vi.fn();
const listShortlistPage = vi.fn();
const setShortlistStatus = vi.fn();
const removeArtistShortlist = vi.fn();
const readArtistNote = vi.fn();
const writeArtistNote = vi.fn();
const removeArtistNote = vi.fn();

vi.mock("@/lib/apiGuards", () => ({
  requireUserSession: () => requireUserSession(),
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
}));

vi.mock("@/lib/pro/discoveryFlag", () => ({
  isProDiscoveryEnabled: () => (globalThis as { __proFlag?: boolean }).__proFlag === true,
}));

vi.mock("@/lib/pro/privateStore", () => ({
  resolveArtistEntity: (...args: unknown[]) => resolveArtistEntity(...args),
}));

vi.mock("@/lib/pro/shortlistStore", () => ({
  addArtistShortlist: (...args: unknown[]) => addArtistShortlist(...args),
  listShortlistPage: (...args: unknown[]) => listShortlistPage(...args),
  setShortlistStatus: (...args: unknown[]) => setShortlistStatus(...args),
  removeArtistShortlist: (...args: unknown[]) => removeArtistShortlist(...args),
  readArtistNote: (...args: unknown[]) => readArtistNote(...args),
  writeArtistNote: (...args: unknown[]) => writeArtistNote(...args),
  removeArtistNote: (...args: unknown[]) => removeArtistNote(...args),
  artistPathKey: (raw: string | undefined) => {
    try {
      return decodeURIComponent(raw ?? "").trim();
    } catch {
      return (raw ?? "").trim();
    }
  },
}));

import { GET as listShortlist, POST as createShortlist } from "@/app/api/pro/shortlist/route";
import { DELETE as deleteShortlist, PATCH as patchShortlist } from "@/app/api/pro/shortlist/[artistId]/route";
import { DELETE as deleteNote, GET as readNote, PUT as writeNote } from "@/app/api/pro/notes/[artistId]/route";

const SECRET = "Account A private test";
const NOW = new Date(Date.UTC(2026, 10, 13, 1, 0, 0));

function sessionFor(userId: string | null) {
  if (!userId) return { session: null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { session: { userId, role: "gallery" }, error: null };
}

class MemoryShortlist implements ShortlistStore {
  rows: ShortlistRow[] = [];
  notes: NoteRow[] = [];
  async findShortlist(userId: string, artistEntityId: string) {
    return this.rows.find((row) => row.userId === userId && row.artistEntityId === artistEntityId) ?? null;
  }
  async createShortlist(row: ShortlistRow) {
    this.rows.push(row);
    return row;
  }
  async updateStatus(userId: string, artistEntityId: string, status: ShortlistRow["status"], now: Date) {
    const row = await this.findShortlist(userId, artistEntityId);
    if (!row) return null;
    row.status = status;
    row.updatedAt = now;
    return row;
  }
  async deleteShortlist(userId: string, artistEntityId: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => !(row.userId === userId && row.artistEntityId === artistEntityId));
    return before - this.rows.length;
  }
  async listShortlists(userId: string) {
    return this.rows.filter((row) => row.userId === userId);
  }
  async findNote(userId: string, artistEntityId: string) {
    return this.notes.find((row) => row.userId === userId && row.artistEntityId === artistEntityId) ?? null;
  }
  async saveNote(row: NoteRow) {
    const existing = await this.findNote(row.userId, row.artistEntityId);
    if (!existing) {
      this.notes.push(row);
      return { row, created: true };
    }
    existing.body = row.body;
    existing.updatedAt = row.updatedAt;
    return { row: existing, created: false };
  }
  async deleteNote(userId: string, artistEntityId: string) {
    const before = this.notes.length;
    this.notes = this.notes.filter((row) => !(row.userId === userId && row.artistEntityId === artistEntityId));
    return before - this.notes.length;
  }
  async listNotes(userId: string, artistEntityIds: string[]) {
    const allowed = new Set(artistEntityIds);
    return this.notes.filter((row) => row.userId === userId && allowed.has(row.artistEntityId));
  }
}

class MemoryWatch implements PrivateStore {
  watches: WatchRow[] = [];
  searches: SearchRow[] = [];
  async findWatch(userId: string, artistEntityId: string) {
    return this.watches.find((row) => row.userId === userId && row.artistEntityId === artistEntityId) ?? null;
  }
  async createWatch(row: WatchRow) {
    this.watches.push(row);
    return row;
  }
  async deleteWatch(userId: string, artistEntityId: string) {
    const before = this.watches.length;
    this.watches = this.watches.filter((row) => !(row.userId === userId && row.artistEntityId === artistEntityId));
    return before - this.watches.length;
  }
  async listWatches(userId: string) {
    return this.watches.filter((row) => row.userId === userId);
  }
  async createSearch(row: SearchRow) {
    this.searches.push(row);
    return row;
  }
  async listSearches(userId: string) {
    return this.searches.filter((row) => row.userId === userId);
  }
  async findSearch(userId: string, id: string) {
    return this.searches.find((row) => row.userId === userId && row.id === id) ?? null;
  }
  async updateSearch() {
    return null;
  }
  async deleteSearch() {
    return false;
  }
}

function filesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...filesUnder(full));
    else if (/\.(ts|tsx)$/.test(name)) found.push(full);
  }
  return found;
}

describe("shortlist and private notes", () => {
  beforeEach(() => {
    (globalThis as { __proFlag?: boolean }).__proFlag = false;
    requireUserSession.mockReset();
    enforceRateLimit.mockReset();
    enforceRateLimit.mockReturnValue(null);
    resolveArtistEntity.mockReset();
    addArtistShortlist.mockReset();
    listShortlistPage.mockReset();
    setShortlistStatus.mockReset();
    removeArtistShortlist.mockReset();
    readArtistNote.mockReset();
    writeArtistNote.mockReset();
    removeArtistNote.mockReset();
  });

  it("returns 404 before auth or existence checks when the flag is off", async () => {
    requireUserSession.mockImplementation(() => {
      throw new Error("auth checked");
    });
    const routes = [
      listShortlist(new Request("http://localhost/api/pro/shortlist")),
      createShortlist(new Request("http://localhost/api/pro/shortlist", { method: "POST", body: "{}" })),
      patchShortlist(new Request("http://localhost/api/pro/shortlist/artist-a", { method: "PATCH", body: "{}" }), { params: { artistId: "artist-a" } }),
      deleteShortlist(new Request("http://localhost/api/pro/shortlist/artist-a", { method: "DELETE" }), { params: { artistId: "artist-a" } }),
      readNote(new Request("http://localhost/api/pro/notes/artist-a"), { params: { artistId: "artist-a" } }),
      writeNote(new Request("http://localhost/api/pro/notes/artist-a", { method: "PUT", body: "{}" }), { params: { artistId: "artist-a" } }),
      deleteNote(new Request("http://localhost/api/pro/notes/artist-a", { method: "DELETE" }), { params: { artistId: "artist-a" } }),
    ];
    const responses = await Promise.all(routes);
    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 404, 404, 404]);
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(resolveArtistEntity).not.toHaveBeenCalled();
    expect(addArtistShortlist).not.toHaveBeenCalled();
    const page = readFileSync(path.join(process.cwd(), "app/pro/shortlist/page.tsx"), "utf8");
    const flagCall = page.indexOf("if (!isProDiscoveryEnabled())");
    const sessionCall = page.indexOf("getServerSession()");
    expect(flagCall).toBeGreaterThan(-1);
    expect(flagCall).toBeLessThan(sessionCall);
  });

  it("returns 401 for anonymous reads and mutations when the flag is on", async () => {
    (globalThis as { __proFlag?: boolean }).__proFlag = true;
    requireUserSession.mockImplementation(() => sessionFor(null));
    const responses = await Promise.all([
      listShortlist(new Request("http://localhost/api/pro/shortlist")),
      createShortlist(new Request("http://localhost/api/pro/shortlist", { method: "POST", body: JSON.stringify({ artistEntityId: "artist-a" }) })),
      readNote(new Request("http://localhost/api/pro/notes/artist-a"), { params: { artistId: "artist-a" } }),
      writeNote(new Request("http://localhost/api/pro/notes/artist-a", { method: "PUT", body: JSON.stringify({ body: SECRET }) }), { params: { artistId: "artist-a" } }),
      deleteNote(new Request("http://localhost/api/pro/notes/artist-a"), { params: { artistId: "artist-a" } }),
      patchShortlist(new Request("http://localhost/api/pro/shortlist/artist-a", { method: "PATCH", body: JSON.stringify({ status: "INTERESTED" }) }), { params: { artistId: "artist-a" } }),
      deleteShortlist(new Request("http://localhost/api/pro/shortlist/artist-a"), { params: { artistId: "artist-a" } }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401, 401]);
    expect(addArtistShortlist).not.toHaveBeenCalled();
    expect(writeArtistNote).not.toHaveBeenCalled();
    for (const response of responses) expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("ignores a userId in the body and rejects it as an unknown field", async () => {
    (globalThis as { __proFlag?: boolean }).__proFlag = true;
    requireUserSession.mockImplementation(() => sessionFor("user-a"));
    const response = await createShortlist(
      new Request("http://localhost/api/pro/shortlist", {
        method: "POST",
        body: JSON.stringify({ artistEntityId: "artist-a", userId: "user-b" }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "unknown_field" });
    expect(addArtistShortlist).not.toHaveBeenCalled();
    expect(resolveArtistEntity).not.toHaveBeenCalled();
  });

  it("rejects an invalid status, an empty note, and a note over 5,000 characters", async () => {
    (globalThis as { __proFlag?: boolean }).__proFlag = true;
    requireUserSession.mockImplementation(() => sessionFor("user-a"));
    resolveArtistEntity.mockResolvedValue({ id: "artist-a", slug: "artist-a", canonicalName: "Artist A" });
    const status = await patchShortlist(
      new Request("http://localhost/api/pro/shortlist/artist-a", { method: "PATCH", body: JSON.stringify({ status: "HOT" }) }),
      { params: { artistId: "artist-a" } },
    );
    expect(status.status).toBe(400);
    await expect(status.json()).resolves.toEqual({ error: "invalid_status" });
    expect(setShortlistStatus).not.toHaveBeenCalled();

    const empty = await writeNote(
      new Request("http://localhost/api/pro/notes/artist-a", { method: "PUT", body: JSON.stringify({ body: "   " }) }),
      { params: { artistId: "artist-a" } },
    );
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "empty_body" });

    const long = await writeNote(
      new Request("http://localhost/api/pro/notes/artist-a", { method: "PUT", body: JSON.stringify({ body: "a".repeat(5001) }) }),
      { params: { artistId: "artist-a" } },
    );
    expect(long.status).toBe(400);
    await expect(long.json()).resolves.toEqual({ error: "body_too_long" });
    expect(writeArtistNote).not.toHaveBeenCalled();
    expect(validateNoteBody("a".repeat(5000)).ok).toBe(true);
  });

  it("stores and renders script text as text", () => {
    const script = "<script>alert(1)</script>";
    const validated = validateNoteBody(script);
    expect(validated).toEqual({ ok: true, body: script });
    const html = renderToStaticMarkup(React.createElement("p", { className: "pd-note-preview" }, script));
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    const note = readFileSync(path.join(process.cwd(), "app/pro/shortlist/NoteText.tsx"), "utf8");
    expect(note).toContain("{body}");
    expect(note).not.toContain("dangerouslySetInnerHTML");
    const editor = readFileSync(path.join(process.cwd(), "app/pro/shortlist/ShortlistCardActions.tsx"), "utf8");
    const page = readFileSync(path.join(process.cwd(), "app/pro/shortlist/page.tsx"), "utf8");
    expect(editor).not.toContain("dangerouslySetInnerHTML");
    expect(page).not.toContain("dangerouslySetInnerHTML");
  });

  it("keeps watch, shortlist, and notes independent across remove and re-add", async () => {
    const watches = new MemoryWatch();
    const shortlists = new MemoryShortlist();
    await watchArtist(watches, "user-a", "artist-a", NOW);
    const added = await addToShortlist(shortlists, "user-a", "artist-a", NOW);
    expect(added.created).toBe(true);
    expect(added.row.status).toBe("REVIEW");
    const again = await addToShortlist(shortlists, "user-a", "artist-a", NOW);
    expect(again.created).toBe(false);
    expect(again.row.status).toBe("REVIEW");

    await changeShortlistStatus(shortlists, "user-a", "artist-a", "INTERESTED", NOW);
    const saved = await savePrivateNote(shortlists, "user-a", "artist-a", SECRET, NOW);
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.created).toBe(true);

    expect(await removeFromShortlist(shortlists, "user-a", "artist-a")).toBe("removed");
    expect(await watches.listWatches("user-a")).toHaveLength(1);
    expect(await shortlists.findNote("user-a", "artist-a")).toMatchObject({ body: SECRET });

    const restored = await addToShortlist(shortlists, "user-a", "artist-a", NOW);
    expect(restored.created).toBe(true);
    expect(restored.row.status).toBe("REVIEW");
    expect((await shortlists.findNote("user-a", "artist-a"))?.body).toBe(SECRET);

    expect(await deletePrivateNote(shortlists, "user-a", "artist-a")).toBe("deleted");
    expect(await shortlists.listShortlists("user-a")).toHaveLength(1);
    expect(await shortlists.findNote("user-a", "artist-a")).toBeNull();

    await unwatchArtist(watches, "user-a", "artist-a");
    expect(await shortlists.listShortlists("user-a")).toHaveLength(1);
    expect(watches.watches).toHaveLength(0);

    const discover = readFileSync(path.join(process.cwd(), "app/pro/discover/page.tsx"), "utf8");
    const shortlistButton = readFileSync(path.join(process.cwd(), "app/pro/ShortlistButton.tsx"), "utf8");
    const watchButton = readFileSync(path.join(process.cwd(), "app/pro/WatchButton.tsx"), "utf8");
    expect(discover).toContain("watchedArtistIds");
    expect(discover).toContain("shortlistedArtistIds");
    expect(shortlistButton).toContain("/api/pro/shortlist");
    expect(shortlistButton).not.toContain("/api/pro/watchlist");
    expect(watchButton).not.toContain("/api/pro/shortlist");
  });

  it("keeps two owners apart and returns 404 for another user's artist id or row id", async () => {
    const store = new MemoryShortlist();
    await addToShortlist(store, "user-a", "artist-a", NOW);
    await changeShortlistStatus(store, "user-a", "artist-a", "PASSED", new Date(NOW.getTime() + 1000));
    await savePrivateNote(store, "user-a", "artist-a", SECRET, NOW);
    await addToShortlist(store, "user-b", "artist-a", NOW);
    await savePrivateNote(store, "user-b", "artist-a", "Account B note", NOW);
    expect((await store.findShortlist("user-a", "artist-a"))?.status).toBe("PASSED");
    expect((await store.findShortlist("user-b", "artist-a"))?.status).toBe("REVIEW");
    expect((await store.findNote("user-a", "artist-a"))?.body).toBe(SECRET);
    expect((await store.findNote("user-b", "artist-a"))?.body).toBe("Account B note");
    expect(await store.findShortlist("user-b", "row-owned-by-a")).toBeNull();
    expect(await store.findNote("user-b", "row-owned-by-a")).toBeNull();
    await removeFromShortlist(store, "user-b", "artist-a");
    expect(await store.listShortlists("user-a")).toHaveLength(1);
    expect((await store.findNote("user-a", "artist-a"))?.body).toBe(SECRET);

    (globalThis as { __proFlag?: boolean }).__proFlag = true;
    requireUserSession.mockImplementation(() => sessionFor("user-b"));
    resolveArtistEntity.mockImplementation(async (id: string) => (id === "artist-a" ? { id: "artist-a", slug: "artist-a", canonicalName: "Artist A" } : null));
    removeArtistShortlist.mockResolvedValue("missing");
    setShortlistStatus.mockResolvedValue({ ok: false, error: "not_found" });
    readArtistNote.mockResolvedValue(null);
    writeArtistNote.mockResolvedValue({ ok: false, error: "not_found" });
    removeArtistNote.mockResolvedValue("missing");

    const direct = await Promise.all([
      readNote(new Request("http://localhost/api/pro/notes/artist-a"), { params: { artistId: "artist-a" } }),
      readNote(new Request("http://localhost/api/pro/notes/row-owned-by-a"), { params: { artistId: "row-owned-by-a" } }),
      patchShortlist(new Request("http://localhost/api/pro/shortlist/artist-a", { method: "PATCH", body: JSON.stringify({ status: "REVIEW" }) }), { params: { artistId: "artist-a" } }),
      deleteShortlist(new Request("http://localhost/api/pro/shortlist/row-owned-by-a"), { params: { artistId: "row-owned-by-a" } }),
      deleteNote(new Request("http://localhost/api/pro/notes/artist-a"), { params: { artistId: "artist-a" } }),
    ]);
    expect(direct.map((response) => response.status)).toEqual([404, 404, 404, 404, 404]);
    for (const response of direct) {
      const text = await response.text();
      expect(text).not.toContain(SECRET);
      expect(text).not.toContain("Account A");
    }
    expect(removeArtistShortlist).not.toHaveBeenCalled();
  });

  it("pages 24 rows, previews 160 characters, and keeps private text out of public and analytics paths", () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      canonicalName: `Artist ${String.fromCharCode(90 - (index % 5))}`,
      id: `id-${String(index).padStart(2, "0")}`,
    }));
    const first = pageShortlist(rows, null);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.items).toHaveLength(SHORTLIST_PAGE_SIZE);
    expect(SHORTLIST_PAGE_SIZE).toBe(24);
    expect(first.items[0].updatedAt > first.items[1].updatedAt).toBe(true);
    const second = pageShortlist(rows, first.nextCursor);
    expect(second.ok && second.items).toHaveLength(6);
    const sameTime = pageShortlist(
      [
        { updatedAt: "2026-01-02T00:00:00.000Z", canonicalName: "가나", id: "b" },
        { updatedAt: "2026-01-02T00:00:00.000Z", canonicalName: "가나", id: "a" },
        { updatedAt: "2026-01-02T00:00:00.000Z", canonicalName: "다라", id: "c" },
      ],
      null,
    );
    expect(sameTime.ok && sameTime.items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(notePreview("x".repeat(180))).toHaveLength(160);
    expect(pageShortlist(rows, "not-a-cursor").ok).toBe(false);

    const artist = (id: string): DiscoveryEntityRow => ({ id, slug: id, canonicalName: id, nativeName: null, profileId: null, aliases: [] });
    const draft: DiscoveryExhibitionRow = {
      id: "draft",
      title: "Draft",
      isPublic: false,
      createdBy: null,
      startDate: null,
      endDate: null,
      city: null,
      country: null,
      space: { id: "space", name: "Hidden", city: null, country: null, slug: "hidden" },
      slug: "draft",
      datePrecision: "YEAR",
      startYear: 2024,
      startMonth: null,
      startDay: null,
      endYear: null,
      endMonth: null,
      endDay: null,
      publicationStatus: "DRAFT",
      origin: "ROB_RESEARCHED",
      sourceClearance: "REVIEW_REQUIRED",
      limitedFactualSource: false,
      participantEntityIds: ["artist-a"],
      confirmedProfileIds: [],
    };
    const graph = buildDiscoveryGraph([draft], [artist("artist-a")]);
    expect(graph.exhibitions).toHaveLength(0);

    for (const name of [
      "PRO_SHORTLIST_ADDED",
      "PRO_SHORTLIST_REMOVED",
      "PRO_SHORTLIST_OPENED",
      "PRO_SHORTLIST_STATUS_CHANGED",
      "PRO_PRIVATE_NOTE_CREATED",
      "PRO_PRIVATE_NOTE_UPDATED",
      "PRO_PRIVATE_NOTE_DELETED",
    ]) {
      expect(isHistoryEvent(name)).toBe(true);
    }
    expect(isHistoryEvent("PRO_ACTIVITY_ALERT_SENT")).toBe(false);
    const actions = readFileSync(path.join(process.cwd(), "app/pro/shortlist/ShortlistCardActions.tsx"), "utf8");
    expect(actions).not.toMatch(/trackHistory\([^)]*draft/);
    expect(actions).not.toMatch(/trackHistory\([^)]*noteBody/);
    expect(actions).toContain('trackHistory("PRO_SHORTLIST_STATUS_CHANGED", path)');

    const discoveryQuery = readFileSync(path.join(process.cwd(), "lib/pro/discoveryQuery.ts"), "utf8");
    expect(discoveryQuery).toContain("publicExhibitionWhere");
    expect(discoveryQuery).not.toContain("ArtistShortlist");
    expect(discoveryQuery).not.toContain("PrivateArtistNote");
    const store = readFileSync(path.join(process.cwd(), "lib/pro/shortlistStore.ts"), "utf8");
    expect(store.match(/loadPublicDiscoveryGraph/g)).toHaveLength(2);
    expect(store).toContain("artistEntityId: { in: artistEntityIds }");
    expect(store).toContain("where: { userId, artistEntityId }");
    const discover = readFileSync(path.join(process.cwd(), "app/pro/discover/page.tsx"), "utf8");
    expect(discover.match(/shortlistedArtistIds\(/g)).toHaveLength(1);
    expect(discover.match(/watchedArtistIds\(/g)).toHaveLength(1);

    for (const file of filesUnder(path.join(process.cwd(), "app/admin")).concat(filesUnder(path.join(process.cwd(), "app/api/admin")), filesUnder(path.join(process.cwd(), "app/api/history")))) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("ArtistShortlist");
      expect(source).not.toContain("PrivateArtistNote");
      expect(source).not.toContain("artistShortlist");
      expect(source).not.toContain("privateArtistNote");
    }
    const sql = readFileSync(path.join(process.cwd(), "prisma/sql/add-pro-shortlist-private-notes.sql"), "utf8");
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql.replace(/ON UPDATE CASCADE/g, "")).not.toMatch(/\bUPDATE\b/i);
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).toContain("ArtistShortlist_userId_artistEntityId_key");
    expect(sql).toContain("PrivateArtistNote_userId_artistEntityId_key");
    expect(SHORTLIST_ITEM_KEYS).not.toContain("noteBody");
    expect(SHORTLIST_ITEM_KEYS).not.toContain("email");
  });
});
