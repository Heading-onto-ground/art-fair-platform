import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { isHistoryEvent } from "@/lib/history/policy";
import { DISCOVERY_PAGE_SIZE, buildDiscoveryGraph, discoverArtists, parseDiscoveryRequest, type DiscoveryEntityRow, type DiscoveryExhibitionRow } from "@/lib/pro/discoveryPolicy";
import {
  canonicalSavedFilter,
  discoveryMembership,
  evaluateSearches,
  newSinceBaseline,
  parseStoredFilter,
  saveDiscoverySearch,
  savedSearchHref,
  unwatchArtist,
  viewSavedSearch,
  watchArtist,
  type PrivateStore,
  type SearchRow,
  type WatchRow,
} from "@/lib/pro/privatePolicy";

const NOW = new Date(Date.UTC(2026, 10, 12));

function artist(id: string, slug: string, canonicalName: string): DiscoveryEntityRow {
  return { id, slug, canonicalName, nativeName: null, profileId: null, aliases: [] };
}

function show(partial: Partial<DiscoveryExhibitionRow> & { id: string; artistIds?: string[] }): DiscoveryExhibitionRow {
  const { artistIds = [], ...rest } = partial;
  return {
    title: rest.id,
    isPublic: true,
    createdBy: null,
    startDate: null,
    endDate: null,
    city: "Seoul",
    country: "Korea",
    space: null,
    slug: rest.id,
    datePrecision: "YEAR",
    startYear: 2024,
    startMonth: null,
    startDay: null,
    endYear: null,
    endMonth: null,
    endDay: null,
    publicationStatus: "PUBLIC",
    origin: "ROB_RESEARCHED",
    sourceClearance: "APPROVED",
    limitedFactualSource: false,
    confirmedProfileIds: [],
    ...rest,
    participantEntityIds: artistIds,
  };
}

function graph(rows: DiscoveryExhibitionRow[], entities: DiscoveryEntityRow[]) {
  return buildDiscoveryGraph(rows, entities);
}

class MemoryStore implements PrivateStore {
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
  async updateSearch(userId: string, id: string, patch: Pick<SearchRow, "baselineIds" | "baselineCapped" | "resultTotalAtView" | "lastViewedAt">) {
    const row = await this.findSearch(userId, id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: patch.lastViewedAt });
    return row;
  }
  async deleteSearch(userId: string, id: string) {
    const before = this.searches.length;
    this.searches = this.searches.filter((row) => !(row.userId === userId && row.id === id));
    return before !== this.searches.length;
  }
}

const entities = [artist("a", "artist-a", "Artist A"), artist("b", "artist-b", "Artist B"), artist("c", "artist-c", "Artist C")];

function filterOf(query: string) {
  const filter = canonicalSavedFilter(parseDiscoveryRequest(new URLSearchParams(query)));
  if (!filter) throw new Error(query);
  return filter;
}

describe("saved search membership", () => {
  it("starts at zero new results and counts a later public match, not artist createdAt", () => {
    const before = graph(
      [
        show({ id: "a1", artistIds: ["a"], startYear: 2020 }),
        show({ id: "a2", artistIds: ["a"], startYear: 2021 }),
        show({ id: "a3", artistIds: ["a"], startYear: 2022 }),
        show({ id: "b1", artistIds: ["b"], startYear: 2010 }),
        show({ id: "b2", artistIds: ["b"], startYear: 2011 }),
      ],
      entities,
    );
    const filter = filterOf("min=3");
    const baseline = discoveryMembership(before, filter, NOW);
    expect(baseline.ids).toEqual(["a"]);
    expect(newSinceBaseline(baseline.ids, baseline.ids)).toBe(0);

    const after = graph(
      [
        show({ id: "a1", artistIds: ["a"], startYear: 2020 }),
        show({ id: "a2", artistIds: ["a"], startYear: 2021 }),
        show({ id: "a3", artistIds: ["a"], startYear: 2022 }),
        show({ id: "b1", artistIds: ["b"], startYear: 2010 }),
        show({ id: "b2", artistIds: ["b"], startYear: 2011 }),
        show({ id: "b3", artistIds: ["b"], startYear: 2024 }),
      ],
      entities,
    );
    const current = discoveryMembership(after, filter, NOW);
    expect(current.ids).toEqual(["a", "b"]);
    expect(newSinceBaseline(baseline.ids, current.ids)).toBe(1);
  });

  it("counts a historical exhibition that makes an existing artist match", () => {
    const before = graph([show({ id: "a1", artistIds: ["a"], startYear: 2024 })], entities);
    const filter = filterOf("from=1990&to=1999");
    const baseline = discoveryMembership(before, filter, NOW);
    expect(baseline.ids).toEqual([]);
    const after = graph(
      [
        show({ id: "a1", artistIds: ["a"], startYear: 2024 }),
        show({ id: "c-old", artistIds: ["c"], startYear: 1994 }),
      ],
      entities,
    );
    expect(newSinceBaseline(baseline.ids, discoveryMembership(after, filter, NOW).ids)).toBe(1);
  });

  it("does not count a draft or a removed match as new", () => {
    const rows = [
      show({ id: "pub", artistIds: ["a"], startYear: 2024 }),
      show({ id: "draft", artistIds: ["b"], publicationStatus: "DRAFT", isPublic: false, startYear: 2024 }),
    ];
    const filter = filterOf("city=Seoul");
    const baseline = discoveryMembership(graph(rows, entities), filter, NOW);
    expect(baseline.ids).toEqual(["a"]);
    const removed = discoveryMembership(graph([show({ id: "gone", artistIds: ["c"], city: "Busan", startYear: 2024 })], entities), filter, NOW);
    expect(newSinceBaseline(baseline.ids, removed.ids)).toBe(0);
  });

  it("keeps two owners' baselines independent and reuses one graph", () => {
    const shared = graph([show({ id: "a1", artistIds: ["a"], startYear: 2024 })], entities);
    const filter = filterOf("city=Seoul");
    const baseA = discoveryMembership(shared, filter, NOW);
    const later = graph(
      [
        show({ id: "a1", artistIds: ["a"], startYear: 2024 }),
        show({ id: "b1", artistIds: ["b"], startYear: 2024 }),
      ],
      entities,
    );
    const row = (id: string, userId: string, baseline: string[]): SearchRow => ({
      id,
      userId,
      name: "Seoul",
      filterJson: filter,
      baselineIds: baseline,
      baselineCapped: false,
      resultTotalAtView: baseline.length,
      lastViewedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const rows = [row("s-a", "user-a", baseA.ids), row("s-b", "user-b", ["a", "b"])];
    let loads = 0;
    const loaded = (() => {
      loads += 1;
      return later;
    })();
    const stats = evaluateSearches(loaded, rows, NOW);
    expect(loads).toBe(1);
    expect(stats.find((item) => item.id === "s-a")?.newCount).toBe(1);
    expect(stats.find((item) => item.id === "s-b")?.newCount).toBe(0);
  });

  it("rejects unsupported filters, reopens the canonical url, and resets after view", async () => {
    expect(parseStoredFilter({ city: "Seoul", email: "a@b.c" })).toBeNull();
    expect(parseStoredFilter({ recent: "nope" })).toBeNull();
    const filter = parseStoredFilter({ city: "Seoul", recent: "3y", min: 3 });
    expect(filter).toEqual({ city: "Seoul", recent: "3y", min: 3 });
    const href = savedSearchHref(filter!, "search-1");
    expect(href.startsWith("/pro/discover?")).toBe(true);
    expect(href).toContain("city=Seoul");
    expect(href).toContain("saved=search-1");
    expect(href).not.toContain("cursor=");

    const store = new MemoryStore();
    const membership = { ids: ["a"], total: 1, capped: false };
    const saved = await saveDiscoverySearch(store, { userId: "user-a", name: "", filter: filter!, membership, now: NOW });
    expect(saved.name).toContain("Seoul");
    expect(newSinceBaseline(saved.baselineIds, ["a", "b"])).toBe(1);
    expect(await viewSavedSearch(store, "user-b", saved.id, { ids: ["a", "b"], total: 2, capped: false })).toBe("missing");
    expect(await viewSavedSearch(store, "user-a", saved.id, { ids: ["a", "b"], total: 2, capped: false })).toBe("updated");
    expect(newSinceBaseline(store.searches[0].baselineIds, ["a", "b"])).toBe(0);
    expect(store.searches[0].userId).toBe("user-a");
    expect(await store.deleteSearch("user-b", saved.id)).toBe(false);
    expect(await store.deleteSearch("user-a", saved.id)).toBe(true);
  });

  it("watches once per user and does not let another user remove it", async () => {
    const store = new MemoryStore();
    const first = await watchArtist(store, "user-a", "artist-a");
    const second = await watchArtist(store, "user-a", "artist-a");
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(store.watches).toHaveLength(1);
    await watchArtist(store, "user-b", "artist-a");
    await unwatchArtist(store, "user-b", "artist-a");
    expect(await store.listWatches("user-a")).toHaveLength(1);
    await unwatchArtist(store, "user-a", "artist-a");
    await unwatchArtist(store, "user-a", "artist-a");
    expect(store.watches).toHaveLength(0);
  });

  it("keeps discovery paging and does not scan the graph once per saved search", () => {
    const many = Array.from({ length: 30 }, (_, index) => artist(String(index), `artist-${index}`, `Artist ${index}`));
    const rows = many.map((item) => show({ id: `show-${item.id}`, artistIds: [item.id], startYear: 2024 }));
    expect(discoverArtists(graph(rows, many), { q: null, city: null, country: null, from: null, to: null, recent: null, min: null, density: null, connected: null, space: null, sort: "name", cursor: null }).cards).toHaveLength(DISCOVERY_PAGE_SIZE);
    const page = readFileSync(path.join(process.cwd(), "app/pro/saved-searches/page.tsx"), "utf8");
    const store = readFileSync(path.join(process.cwd(), "lib/pro/privateStore.ts"), "utf8");
    expect(store.match(/loadPublicDiscoveryGraph/g)?.length).toBeGreaterThan(0);
    expect(store).toContain("evaluateSearches");
    expect(page).not.toContain("loadPublicDiscoveryGraph");
    for (const file of [
      "app/api/pro/watchlist/route.ts",
      "app/api/pro/watchlist/[artistId]/route.ts",
      "app/api/pro/saved-searches/route.ts",
      "app/api/pro/saved-searches/[id]/route.ts",
      "app/api/pro/saved-searches/[id]/view/route.ts",
    ]) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("proGate");
      expect(source).not.toContain("body.userId");
    }
    const gate = readFileSync(path.join(process.cwd(), "lib/pro/proGate.ts"), "utf8");
    expect(gate).toContain("isProDiscoveryEnabled");
    expect(gate).toContain("requireUserSession");
    expect(store).toContain("where: { id, userId }");
    expect(store).toContain("userId_artistEntityId");
    expect(isHistoryEvent("PRO_WATCH_ADDED")).toBe(true);
    expect(isHistoryEvent("PRO_SAVED_SEARCH_OPENED")).toBe(true);
    expect(isHistoryEvent("PRO_ACTIVITY_ALERT_SENT")).toBe(false);
    expect(readFileSync(path.join(process.cwd(), "lib/pro/privatePolicy.ts"), "utf8")).not.toContain("createdAt >");
  });
});
