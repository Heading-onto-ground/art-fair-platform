import { beforeEach, describe, expect, it, vi } from "vitest";
import { extendJourney, readJourneySteps, retreatJourney } from "@/lib/history/journeyTrail";
import { depthEventForTrail, gtmContainerId, pushRobEventOnce, resetPublicEventDedupe, siteVerification } from "@/lib/publicGrowth/analytics";
import { EXAMPLE_ARTISTS } from "@/lib/publicGrowth/examplePath";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

describe("multi-step back trail", () => {
  it("keeps Back from C to B to A and then removes it", () => {
    const storage = memory();
    const id = "abcd1234";
    const step = (artist: string) => ({ artist, mode: "year" as const, focus: "2005", exhibition: "show", scrollY: 10 });
    extendJourney(storage, id, step("lee-ufan"));
    extendJourney(storage, id, step("park-seo-bo"));
    expect(readJourneySteps(storage, id).map((item) => item.artist)).toEqual(["lee-ufan", "park-seo-bo"]);

    const toB = retreatJourney(storage, id);
    expect(toB?.step.artist).toBe("park-seo-bo");
    expect(toB?.rest.map((item) => item.artist)).toEqual(["lee-ufan"]);
    expect(toB && toB.rest.length > 0).toBe(true);

    const toA = retreatJourney(storage, id);
    expect(toA?.step.artist).toBe("lee-ufan");
    expect(toA?.rest).toEqual([]);

    expect(retreatJourney(storage, id)).toBeNull();
  });

  it("derives depth from the existing trail and not from a second store", () => {
    expect(depthEventForTrail(1)).toBe("SECOND_ARTIST_REACHED");
    expect(depthEventForTrail(2)).toBe("THIRD_ARTIST_REACHED");
    expect(depthEventForTrail(3)).toBe("FOURTH_ARTIST_REACHED");
    expect(depthEventForTrail(0)).toBeNull();
  });
});

describe("public dataLayer", () => {
  beforeEach(() => {
    resetPublicEventDedupe();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T00:00:00Z"));
    (globalThis as { window?: Window }).window = { dataLayer: [] } as unknown as Window;
  });

  it("pushes a page-open event once inside the dedupe window", () => {
    expect(pushRobEventOnce("GUIDE_PAGE_OPENED", "ko", { language: "ko" })).toBe(true);
    expect(pushRobEventOnce("GUIDE_PAGE_OPENED", "ko", { language: "ko" })).toBe(false);
    const layer = (window as unknown as { dataLayer: { event: string }[] }).dataLayer;
    expect(layer.filter((row) => row.event === "GUIDE_PAGE_OPENED")).toHaveLength(1);
  });
});

describe("growth config", () => {
  it("omits verification and GTM when unset", () => {
    expect(siteVerification("", " ")).toBeUndefined();
    expect(gtmContainerId("")).toBeNull();
  });

  it("links the example path to canonical artist routes", () => {
    expect(EXAMPLE_ARTISTS.map((artist) => artist.slug)).toEqual(["lee-ufan", "park-seo-bo", "yun-hyong-keun"]);
    expect(gtmContainerId("GTM-ROBTEST")).toBe("GTM-ROBTEST");
  });
});
