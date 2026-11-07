import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { pushJourneyStep } from "@/lib/history/journeyTrail";
import {
  artistDisplayName,
  artistDisplayNames,
  lookupArtistName,
  peopleDisplayNames,
} from "@/lib/history/names";
import { rankSearchRows } from "@/lib/history/searchMatch";

const lee = { canonicalName: "Lee Ufan", nativeName: "이우환" };
const park = { canonicalName: "Park Seo-Bo", nativeName: "박서보" };
const chung = { canonicalName: "Chung Sang-Hwa", nativeName: "정상화" };
const yun = { canonicalName: "Yun Hyong-keun", nativeName: "윤형근" };
const kwon = { canonicalName: "Kwon Young-Woo", nativeName: "권영우" };
const yang = { canonicalName: "Haegue Yang", nativeName: "양혜규" };
const whanki = { canonicalName: "Kim Whanki", nativeName: "김환기" };
const byron = { canonicalName: "Byron Kim", nativeName: null };

const people = [chung, yun, kwon, park, lee].map((artist) => ({
  name: artist.canonicalName,
  nativeName: artist.nativeName,
}));

describe("artist display names", () => {
  it("puts the Hangul name first on a Korean page and the canonical name first in English", () => {
    expect(artistDisplayNames({ ...lee, locale: "ko" })).toEqual({ primary: "이우환", secondary: "Lee Ufan" });
    expect(artistDisplayNames({ ...lee, locale: "en" })).toEqual({ primary: "Lee Ufan", secondary: "이우환" });
    expect(artistDisplayName({ ...park, locale: "ko" })).toBe("박서보");
    expect(artistDisplayName({ ...chung, locale: "ko" })).toBe("정상화");
    expect(artistDisplayName({ ...yang, locale: "ko" })).toBe("양혜규");
    expect(artistDisplayName({ ...whanki, locale: "ko" })).toBe("김환기");
    expect(artistDisplayName({ ...park, locale: "en" })).toBe("Park Seo-Bo");
  });

  it("does not invent a Korean name or repeat the same name", () => {
    expect(artistDisplayNames({ ...byron, locale: "ko" })).toEqual({ primary: "Byron Kim", secondary: null });
    expect(artistDisplayNames({ ...byron, locale: "en" })).toEqual({ primary: "Byron Kim", secondary: null });
    expect(artistDisplayName({ canonicalName: "Artist", nativeName: "", locale: "ko" })).toBe("Artist");
    expect(artistDisplayName({ canonicalName: "Artist", nativeName: "   ", locale: "ko" })).toBe("Artist");
    expect(artistDisplayNames({ canonicalName: "Artist", nativeName: "Artist", locale: "ko" })).toEqual({
      primary: "Artist",
      secondary: null,
    });
    expect(artistDisplayNames({ canonicalName: "Lee Ufan", nativeName: "Lee Ufan", locale: "en" })).toEqual({
      primary: "Lee Ufan",
      secondary: null,
    });
    expect(artistDisplayNames({ canonicalName: "Lee Ufan", nativeName: "Lee Ufan", locale: "ko" })).toEqual({
      primary: "Lee Ufan",
      secondary: null,
    });
  });

  it("renders the connected people list in Hangul on Korean pages and canonical names in English", () => {
    expect(peopleDisplayNames(people, "ko")).toEqual(["정상화", "윤형근", "권영우", "박서보", "이우환"]);
    expect(peopleDisplayNames(people, "en")).toEqual([
      "Chung Sang-Hwa",
      "Yun Hyong-keun",
      "Kwon Young-Woo",
      "Park Seo-Bo",
      "Lee Ufan",
    ]);
  });

  it("labels moment nodes from the artist record, not from a slug", () => {
    expect(artistDisplayName({ canonicalName: yun.canonicalName, nativeName: yun.nativeName, locale: "ko" })).toBe("윤형근");
    expect(lookupArtistName("yun-hyong-keun", [{ slug: "yun-hyong-keun", name: "Yun Hyong-keun", nativeName: "윤형근" }])).toEqual({
      canonicalName: "Yun Hyong-keun",
      nativeName: "윤형근",
    });
    expect(lookupArtistName("yun-hyong-keun", [])).toBeNull();
    expect(artistDisplayName({
      ...lookupArtistName("yun-hyong-keun", [{ slug: "yun-hyong-keun", canonicalName: "Yun Hyong-keun", nativeName: "윤형근" }])!,
      locale: "ko",
    })).toBe("윤형근");
  });

  it("keeps search resolution and journey identity on the canonical record", () => {
    const rows = [
      { canonicalName: "Lee Ufan", nativeName: "이우환", aliases: [{ label: "Lee Ufan" }, { label: "이우환" }] },
      { canonicalName: "Park Seo-Bo", nativeName: "박서보", aliases: [{ label: "Park Seo-Bo" }, { label: "박서보" }] },
    ];
    expect(rankSearchRows(rows, "Lee Ufan").map((row) => row.canonicalName)).toEqual(["Lee Ufan"]);
    expect(rankSearchRows(rows, "이우환").map((row) => row.canonicalName)).toEqual(["Lee Ufan"]);
    expect(rankSearchRows(rows, "Park Seo-Bo").map((row) => row.canonicalName)).toEqual(["Park Seo-Bo"]);
    expect(rankSearchRows(rows, "박서보").map((row) => row.canonicalName)).toEqual(["Park Seo-Bo"]);
    expect(artistDisplayName({ ...lee, locale: "ko" })).not.toBe("lee-ufan");

    const trail = pushJourneyStep(
      pushJourneyStep([], { artist: "lee-ufan", mode: "all", focus: null, exhibition: "when-process-becomes-form", scrollY: null }),
      { artist: "park-seo-bo", mode: null, focus: null, exhibition: null, scrollY: null },
    );
    expect(trail.map((step) => step.artist)).toEqual(["lee-ufan", "park-seo-bo"]);
  });

  it("switches the visible name with the locale and leaves the slug alone", () => {
    const artist = { slug: "lee-ufan", ...lee };
    expect(artistDisplayName({ ...artist, locale: "ko" })).toBe("이우환");
    expect(artistDisplayName({ ...artist, locale: "en" })).toBe("Lee Ufan");
    expect(artist.slug).toBe("lee-ufan");
  });

  it("uses the display helper in the public artist surfaces and does not title-case slugs", () => {
    const experience = readFileSync("app/components/history/HistoryExperience.tsx", "utf8");
    const home = readFileSync("app/components/history/HistoryHome.tsx", "utf8");
    const search = readFileSync("app/api/history/search/route.ts", "utf8");
    expect(experience).toContain("artistDisplayNames");
    expect(experience).not.toContain('split("-")');
    expect(experience).toContain("query={artist.canonicalName}");
    expect(home).toContain("artistDisplayNames");
    expect(home).toContain("href={publicHref(`/artists/${artist.slug}`)}");
    expect(search).toContain("searchArtists(query)");
    expect(search).not.toContain("artistDisplayName");
  });
});
