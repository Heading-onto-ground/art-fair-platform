import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyRosterEntries,
  isTrustedArtistProfileUrl,
  matchArtistRoster,
  parseArtistRoster,
  rosterByIndex,
  TRUSTED_ARTIST_ROSTERS,
} from "@/lib/history/artistRosters";
import { galleryRosterObservations, mergeObservations, type ExpansionGraph } from "@/lib/history/expansionCandidates";

const fixture = (name: string) => readFileSync(resolve(__dirname, "fixtures", "rosters", name), "utf8");

const names = [
  { slug: "haegue-yang", labels: ["Haegue Yang", "양혜규"] },
  { slug: "park-hyun-ki", labels: ["Park Hyun-Ki", "박현기"] },
  { slug: "kim-guiline", labels: ["Kim Guiline", "김기린", "Kim Gui-line"] },
  { slug: "known-painter", labels: ["Known Painter"] },
];

const graph = (): ExpansionGraph => ({
  artists: names.map((artist) => ({ slug: artist.slug, labels: artist.labels, exhibitionIds: [] })),
  exhibitions: [],
  unresolved: [],
});

describe("trusted artist rosters", () => {
  it("keeps Kukje extraction and does not invent a second Gimhongsok identity", () => {
    const roster = rosterByIndex("https://www.kukjegallery.com/artists");
    expect(roster?.adapter).toBe("kukje-roster");
    if (!roster) return;
    const html = fixture("kukje-artists.html");
    const parsed = parseArtistRoster(html, roster);
    expect(parsed.map((row) => row.displayName)).toEqual(["Other Artist", "Haegue Yang", "Gimhongsok", "Byron Kim", "Gimhongsok", "Sasa[44]"]);
    expect(parsed.find((row) => row.displayName === "Sasa[44]")?.rosterQualifier).toBe("UNKNOWN_ENTITY_TYPE");
    expect(parsed.find((row) => row.displayName === "Haegue Yang")?.nativeNameCandidate).toBe("양혜규");
    expect(parsed.find((row) => row.displayName === "Byron Kim")?.nativeNameCandidate).toBe("바이런 킴");
    expect(parsed.filter((row) => row.displayName === "Byron Kim")).toHaveLength(1);
    expect(parsed.filter((row) => row.displayName === "Gimhongsok").map((row) => row.rosterQualifier)).toEqual([null, "UNKNOWN_ENTITY_TYPE"]);
    expect(parsed.some((row) => row.displayName === "Press Only" || row.displayName === "Missing Link")).toBe(false);
    expect(matchArtistRoster(html, ["Haegue Yang"], roster.indexUrl)?.url).toBe("https://www.kukjegallery.com/artists/view?seq=176");
    expect(matchArtistRoster(html, ["양혜규"], roster.indexUrl)?.url).toContain("seq=176");
    expect(matchArtistRoster(html, ["Gimhongsok"], roster.indexUrl)).toBeNull();
    const classified = classifyRosterEntries(parsed, names);
    expect(classified.existing.map((row) => row.artistSlug)).toEqual(["haegue-yang"]);
    expect(classified.candidates.map((row) => row.displayName)).toEqual(["Other Artist", "Gimhongsok", "Byron Kim"]);
    expect(classified.review.map((row) => row.displayName)).toContain("Sasa[44]");
  });

  it("keeps Gallery Hyundai estate labels intact and holds collectives", () => {
    const roster = TRUSTED_ARTIST_ROSTERS.find((item) => item.adapter === "hyundai-roster");
    expect(roster?.indexUrl).toBe("https://www.galleryhyundai.com/artist/list");
    if (!roster) return;
    const html = fixture("hyundai-artists.html");
    const parsed = parseArtistRoster(html, roster);
    const estate = parsed.find((row) => row.rawLabel === "Park Hyunki Estate");
    expect(estate).toMatchObject({
      displayName: "Park Hyunki Estate",
      rosterQualifier: "ESTATE",
      profileUrl: "https://www.galleryhyundai.com/artist/view/20000000033",
      adapter: "hyundai-roster",
    });
    expect(estate?.displayName).not.toBe("Park Hyunki");
    expect(parsed.find((row) => row.rawLabel === "MOON & JEON")?.rosterQualifier).toBe("COLLECTIVE_CANDIDATE");
    expect(parsed.find((row) => row.displayName === "MOON Kyungwon")?.rosterQualifier).toBeNull();
    expect(parsed.find((row) => row.displayName === "Malformed Row")?.profileUrl).toBeNull();
    expect(parsed.some((row) => row.displayName === "News Person" || row.displayName === "No Link Person")).toBe(false);
    const classified = classifyRosterEntries(parsed, names);
    expect(classified.existing.map((row) => row.entry.displayName)).not.toContain("Park Hyunki Estate");
    expect(classified.existing.map((row) => row.entry.displayName)).not.toContain("Kim Guiline Estate");
    expect(classified.review.map((row) => row.displayName)).toEqual([
      "Chung Sang-Hwa Estate",
      "Kim Guiline Estate",
      "MOON & JEON",
      "Park Hyunki Estate",
    ]);
    expect(classified.candidates.map((row) => row.displayName)).toEqual(["Ayoung Kim", "MOON Kyungwon"]);
    const observations = galleryRosterObservations({
      html,
      indexUrl: roster.indexUrl,
      sourceName: roster.sourceName,
      graph: graph(),
      seenAt: "2026-11-06T00:00:00.000Z",
    });
    expect(observations.map((row) => row.label)).toEqual(["Ayoung Kim", "MOON Kyungwon"]);
    expect(observations[0]).toMatchObject({
      rosterAdapter: "hyundai-roster",
      rawLabel: "Ayoung Kim",
      via: { institution: "Gallery Hyundai" },
    });
    const merged = mergeObservations({
      existing: [],
      observations,
      now: "2026-11-06T00:00:00.000Z",
      observationLimit: 20,
      writeLimit: 20,
    });
    expect(merged.rows.map((row) => row.displayName)).not.toContain("MOON & JEON");
    expect(merged.rows.map((row) => row.displayName)).not.toContain("Park Hyunki Estate");
    expect(merged.rows.every((row) => row.payload.labelClass === "PERSON_LIKE")).toBe(true);
  });

  it("separates Arario artists from the estate section and keeps accented names", () => {
    const roster = TRUSTED_ARTIST_ROSTERS.find((item) => item.adapter === "arario-roster");
    if (!roster) return;
    const html = fixture("arario-artists.html");
    const parsed = parseArtistRoster(html, roster);
    expect(parsed.some((row) => row.displayName === "Site title")).toBe(false);
    expect(parsed.find((row) => row.displayName === "AHN Jisan")).toMatchObject({
      rosterQualifier: null,
      profileUrl: "https://www.arariogallery.com/artists/241-ahn-jisan/",
    });
    expect(parsed.find((row) => row.displayName === "Yohan HÀN")?.rosterQualifier).toBeNull();
    expect(parsed.find((row) => row.displayName === "GU Bonju")?.rosterQualifier).toBe("ESTATE");
    expect(parsed.find((row) => row.displayName === "PARK Youngsook")?.rosterQualifier).toBe("ESTATE");
    expect(parsed.some((row) => row.displayName === "Missing Link")).toBe(false);
    expect(parsed.some((row) => row.displayName === "Language Switch" || row.displayName === "News Name")).toBe(false);
    const classified = classifyRosterEntries(parsed, names);
    expect(classified.existing.map((row) => row.artistSlug)).toEqual(["known-painter"]);
    expect(classified.candidates.map((row) => row.displayName)).toEqual(["AHN Jisan", "Yohan HÀN"]);
    expect(classified.review.map((row) => row.displayName)).toEqual(["GU Bonju", "PARK Youngsook"]);
    expect(isTrustedArtistProfileUrl("https://www.arariogallery.com/artists/241-ahn-jisan/")).toBe(true);
    expect(isTrustedArtistProfileUrl("https://www.arariogallery.com/news/1")).toBe(false);
    expect(isTrustedArtistProfileUrl("https://www.galleryhyundai.com/artist/view/20000000002")).toBe(true);
  });

  it("keeps a write budget from being filled by one roster", () => {
    const seenAt = "2026-11-06T00:00:00.000Z";
    const observations = ["kukje-artists.html", "hyundai-artists.html", "arario-artists.html"].flatMap((name) => {
      const file = name.startsWith("kukje") ? "kukje" : name.startsWith("hyundai") ? "hyundai" : "arario";
      const roster = TRUSTED_ARTIST_ROSTERS.find((item) => item.adapter.startsWith(file));
      if (!roster) return [];
      return galleryRosterObservations({
        html: fixture(name),
        indexUrl: roster.indexUrl,
        sourceName: roster.sourceName,
        graph: graph(),
        seenAt,
      });
    });
    const merged = mergeObservations({
      existing: [],
      observations,
      now: seenAt,
      observationLimit: 20,
      writeLimit: 3,
    });
    expect(new Set(merged.rows.map((row) => row.payload.provenance[0]?.viaInstitution))).toEqual(new Set([
      "Kukje Gallery",
      "Gallery Hyundai",
      "Arario Gallery",
    ]));
  });
});
