import { describe, expect, it } from "vitest";
import { PUBLIC_HISTORY_CACHE_TAG } from "@/lib/history/publicGraph";
import { isCronAuthorized } from "@/lib/cronAuth";
import {
  publicCacheTargets,
  publicRefreshUrl,
  refreshOutcome,
  requestPublicHistoryRefresh,
} from "@/lib/history/cacheRefresh";
import { labelAppearsInTitle, participantEvidence, mayCreateParticipation } from "@/lib/history/identity";

describe("public history cache refresh", () => {
  it("invalidates only the public history tag and sitemap", () => {
    const targets = publicCacheTargets();
    expect(targets.tag).toBe(PUBLIC_HISTORY_CACHE_TAG);
    expect(targets.tag).toBe("rob-public-artist-history");
    expect(targets.paths).toEqual(["/sitemap.xml"]);
    expect(JSON.stringify(targets)).not.toMatch(/admin|user|profile|private/i);
  });

  it("classifies a failed refresh without treating the write as undone", () => {
    expect(refreshOutcome({ httpStatus: 200, bodyStatus: "CACHE_INVALIDATION_COMPLETE" }).status).toBe("CACHE_INVALIDATION_COMPLETE");
    expect(refreshOutcome({ httpStatus: 401 }).status).toBe("WRITE_SUCCEEDED_CACHE_REFRESH_FAILED");
    expect(refreshOutcome({ httpStatus: null, error: "SECRET_MISSING" })).toEqual({
      status: "WRITE_SUCCEEDED_CACHE_REFRESH_FAILED",
      reason: "SECRET_MISSING",
    });
  });

  it("does not call the network when the secret is missing", async () => {
    let called = false;
    const outcome = await requestPublicHistoryRefresh({
      origin: "https://rob-roleofbridge.com",
      secret: " ",
      fetchImpl: async () => {
        called = true;
        return new Response(null, { status: 500 });
      },
    });
    expect(called).toBe(false);
    expect(outcome.status).toBe("WRITE_SUCCEEDED_CACHE_REFRESH_FAILED");
    expect(publicRefreshUrl("https://rob-roleofbridge.com/")).toBe(
      "https://rob-roleofbridge.com/api/cron/refresh-public-history",
    );
  });

  it("keeps the refresh route closed without the cron secret", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-secret";
    const open = new Request("https://rob-roleofbridge.com/api/cron/refresh-public-history", { method: "POST" });
    const closed = isCronAuthorized(open, { allowAdminSession: true, allowDevWithoutSecret: false });
    const allowed = isCronAuthorized(
      new Request("https://rob-roleofbridge.com/api/cron/refresh-public-history", {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
      }),
      { allowAdminSession: true, allowDevWithoutSecret: false },
    );
    process.env.CRON_SECRET = previous;
    expect(closed).toBe(false);
    expect(allowed).toBe(true);
  });
});

describe("participant evidence", () => {
  it("creates an edge only from an explicit participant", () => {
    expect(participantEvidence({ listedAsParticipant: true, namedInTitle: true })).toBe("EXPLICIT_PARTICIPANT");
    expect(participantEvidence({ listedAsParticipant: false, namedInTitle: true })).toBe("TITLE_ONLY");
    expect(participantEvidence({ listedAsParticipant: false, namedInTitle: false, ambiguous: true })).toBe("AMBIGUOUS");
    expect(participantEvidence({ listedAsParticipant: false, namedInTitle: false })).toBe("NOT_PARTICIPANT");
    expect(mayCreateParticipation("EXPLICIT_PARTICIPANT")).toBe(true);
    expect(mayCreateParticipation("TITLE_ONLY")).toBe(false);
    expect(mayCreateParticipation("AMBIGUOUS")).toBe(false);
    expect(mayCreateParticipation("NOT_PARTICIPANT")).toBe(false);
    expect(labelAppearsInTitle("Youn Myeungro", "Chung Chang-Sub, Kim Tschang-Yeul, Park Seo-Bo, Ha Chong-Hyun, Kim Hyung Dae, Youn Myeungro")).toBe(true);
  });
});
