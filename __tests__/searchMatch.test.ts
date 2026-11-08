import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rankRecordedMentions, rankSearchRows, searchProbe, type RecordedMentionInput } from "@/lib/history/searchMatch";

const lee = {
  canonicalName: "Lee Ufan",
  nativeName: "이우환",
  aliases: [{ label: "Lee U-Fan" }, { label: "Lee U Fan" }],
};
const youn = {
  canonicalName: "Youn Myeungro",
  nativeName: "윤명로",
  aliases: [] as { label: string }[],
};

describe("search matching", () => {
  it("keeps exact alias matches and rejects a different spelling", () => {
    expect(rankSearchRows([lee, youn], "Lee U-Fan").map((row) => row.canonicalName)).toEqual(["Lee Ufan"]);
    expect(rankSearchRows([lee, youn], "이우환").map((row) => row.canonicalName)).toEqual(["Lee Ufan"]);
    expect(rankSearchRows([lee, youn], "Youn Myeung-Ro")).toEqual([]);
    expect(rankSearchRows([youn], "Youn Myeungro").map((row) => row.canonicalName)).toEqual(["Youn Myeungro"]);
  });

  it("ranks an exact name ahead of a prefix", () => {
    const other = { canonicalName: "Lee Ufan Studio", nativeName: null, aliases: [] as { label: string }[] };
    expect(rankSearchRows([other, lee], "Lee Ufan").map((row) => row.canonicalName)).toEqual(["Lee Ufan", "Lee Ufan Studio"]);
  });

  it("probes with the longest normalized token", () => {
    expect(searchProbe("Lee U-Fan")).toBe("fan");
    expect(searchProbe("박서보")).toBe("박서보");
  });

  it("runs search beside the Mumbai database", () => {
    const route = readFileSync(resolve(__dirname, "../app/api/history/search/route.ts"), "utf8");
    expect(route).toContain('preferredRegion = "bom1"');
    expect(route).toContain("searchArtists(query)");
    expect(route).toContain("results.length === 0 ? await searchRecordedMentions(query)");
  });
});

describe("recorded exhibition mentions", () => {
  const shared: RecordedMentionInput = {
    label: "KAWS",
    exhibitionId: "ex-1",
    exhibitionSlug: "gallery-show",
    title: "Gallery Show",
    artists: [{ slug: "lee-ufan", canonicalName: "Lee Ufan", nativeName: "이우환" }],
  };
  const longer: RecordedMentionInput = {
    label: "KAWS Studio",
    exhibitionId: "ex-2",
    exhibitionSlug: "later-show",
    title: "Later Show",
    artists: [],
  };

  it("opens the recorded exhibition for an exact unresolved name", () => {
    const found = rankRecordedMentions([longer, shared], "KAWS");
    expect(found.map((row) => row.exhibitionSlug)).toEqual(["gallery-show"]);
    expect(found[0]?.artists).toEqual([{ slug: "lee-ufan", canonicalName: "Lee Ufan", nativeName: "이우환" }]);
  });

  it("does not invent an artist page, a Korean name, or a longer-name identity", () => {
    const bare: RecordedMentionInput = { ...shared, label: "Byron Kim", artists: [{ slug: "byron-kim", canonicalName: "Byron Kim", nativeName: null }] };
    expect(rankRecordedMentions([bare], "Byron Kim")[0]?.artists[0]?.nativeName).toBeNull();
    expect(rankRecordedMentions([shared], "Kim, Guirin")).toEqual([]);
    expect(rankRecordedMentions([longer], "KAWS")).toEqual([]);
    expect(rankRecordedMentions([{ ...shared, exhibitionSlug: null }], "KAWS")).toEqual([]);
  });

  it("keeps one row when the same exhibition matches twice", () => {
    const again = { ...shared, label: "kaws" };
    expect(rankRecordedMentions([shared, again], "KAWS")).toHaveLength(1);
  });

  it("does not create an artist from the search route", () => {
    const route = readFileSync(resolve(__dirname, "../app/api/history/search/route.ts"), "utf8");
    const home = readFileSync(resolve(__dirname, "../app/components/history/HistoryHome.tsx"), "utf8");
    expect(route).not.toMatch(/artistEntity\.create|ArtistEntity/);
    expect(home).toContain("copy.unconfirmedName");
    expect(home).toContain("copy.viewExhibition");
    expect(home).not.toContain("participated");
  });
});
