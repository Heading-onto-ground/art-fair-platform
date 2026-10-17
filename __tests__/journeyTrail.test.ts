import { describe, expect, it } from "vitest";
import {
  JOURNEY_TRAIL_LIMIT,
  continueJourneyHref,
  extendJourney,
  followArtistHref,
  newJourneyId,
  pushJourneyStep,
  readJourneySteps,
  rememberJourneyCursor,
  restoredJourneyHref,
  retreatJourney,
  validJourneyId,
  withPreservedSearch,
  type JourneyStep,
} from "@/lib/history/journeyTrail";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

function step(artist: string, year: string, exhibition: string): JourneyStep {
  return { artist, mode: "year", focus: year, exhibition, scrollY: 480 };
}

describe("journey trail", () => {
  it("keeps a bounded stack and restores each hop", () => {
    const first = step("lee-ufan", "2005", "das-koreanische-monochrom");
    const second = step("park-seo-bo", "2005", "das-koreanische-monochrom");
    const third = step("yun-hyong-keun", "2014", "another-exhibition");
    let trail = pushJourneyStep([], first);
    trail = pushJourneyStep(trail, second);
    trail = pushJourneyStep(trail, third);
    expect(trail.map((item) => item.artist)).toEqual(["lee-ufan", "park-seo-bo", "yun-hyong-keun"]);

    const backToPark = restoredJourneyHref(trail[1], "abcd1234");
    expect(backToPark).toBe("/artists/park-seo-bo?j=abcd1234&event=das-koreanische-monochrom&zoom=year&focus=2005");
    expect(backToPark).not.toContain("scroll=");
    expect(backToPark).not.toContain("from=");

    const backToLee = restoredJourneyHref(trail[0], null);
    expect(backToLee).toBe("/artists/lee-ufan?event=das-koreanische-monochrom&zoom=year&focus=2005");
    expect(backToLee).not.toContain("j=");
  });

  it("drops the oldest context after the depth limit", () => {
    let trail: JourneyStep[] = [];
    for (let index = 0; index < JOURNEY_TRAIL_LIMIT + 1; index += 1) {
      trail = pushJourneyStep(trail, step(`artist-${index}`, "2000", "show"));
    }
    expect(trail).toHaveLength(JOURNEY_TRAIL_LIMIT);
    expect(trail[0]?.artist).toBe("artist-1");
    expect(trail.at(-1)?.artist).toBe(`artist-${JOURNEY_TRAIL_LIMIT}`);
  });

  it("stores one session trail and retreats without inventing a direct-visit return", () => {
    const storage = memoryStorage();
    const id = "abcd1234";
    expect(validJourneyId(id)).toBe(id);
    expect(validJourneyId("short")).toBeNull();
    expect(newJourneyId()).toMatch(/^[a-z0-9]{8}$/);
    rememberJourneyCursor(storage, id, step("lee-ufan", "2005", "show-a"));
    expect(readJourneySteps(storage, id)).toEqual([]);
    expect(continueJourneyHref(storage, "lee-ufan", "show-a")).toBeNull();

    const href = continueJourneyHref(storage, "park-seo-bo", "show-a");
    expect(href).toBe("/artists/park-seo-bo?j=abcd1234&via=show-a");
    expect(readJourneySteps(storage, id).map((item) => item.artist)).toEqual(["lee-ufan"]);

    extendJourney(storage, id, step("park-seo-bo", "2005", "show-a"));
    const first = retreatJourney(storage, id);
    expect(first?.step.artist).toBe("park-seo-bo");
    expect(first?.rest.map((item) => item.artist)).toEqual(["lee-ufan"]);
    expect(restoredJourneyHref(first!.step, first!.rest.length > 0 ? id : null)).toContain("j=abcd1234");

    const second = retreatJourney(storage, id);
    expect(second?.step.artist).toBe("lee-ufan");
    expect(second?.rest).toEqual([]);
    expect(restoredJourneyHref(second!.step, null)).not.toContain("j=");
    expect(retreatJourney(storage, id)).toBeNull();
    expect(readJourneySteps(storage, "otherid1")).toEqual([]);
  });

  it("preserves the journey query when an alias resolves to the canonical artist", () => {
    expect(withPreservedSearch("/artists/lee-ufan", { j: "abcd1234", via: "show-a", zoom: "year" })).toBe(
      "/artists/lee-ufan?j=abcd1234&via=show-a&zoom=year",
    );
    expect(followArtistHref("yun-hyong-keun", "not-valid", "show-a")).toBe("/artists/yun-hyong-keun?via=show-a");
  });
});
