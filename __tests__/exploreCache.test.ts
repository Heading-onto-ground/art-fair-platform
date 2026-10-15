import { describe, expect, it } from "vitest";
import { publicExploreCache } from "@/lib/history/queries";
import { PUBLIC_HISTORY_CACHE_TAG } from "@/lib/history/publicGraph";

describe("explore cache", () => {
  it("uses the shared history tag and a short public TTL", () => {
    expect(publicExploreCache.tags).toEqual([PUBLIC_HISTORY_CACHE_TAG]);
    expect(publicExploreCache.revalidate).toBeGreaterThanOrEqual(60);
    expect(publicExploreCache.revalidate).toBeLessThanOrEqual(300);
    expect(publicExploreCache.key[0]).toBe("rob-public-explore");
  });
});
