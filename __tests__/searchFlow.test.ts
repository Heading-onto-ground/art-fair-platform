import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { resolveVerifiedAlias } from "@/lib/history/identity";
import {
  SEARCH_CLIENT_TIMEOUT_MS,
  SEARCH_EMPTY_COPY,
  SEARCH_ERROR_COPY,
  acceptAutocomplete,
  claimSubmit,
  finishSearch,
  historySearchBody,
  persistMissingSearch,
  reuseCompletedSearch,
} from "@/lib/history/searchFlow";

const lee = { slug: "lee-ufan", canonicalName: "Lee Ufan" };

describe("history search flow", () => {
  it("resolves Lee Ufan, the spaced alias, and the native name", () => {
    expect(resolveVerifiedAlias("Lee Ufan")).toBe("lee-ufan");
    expect(resolveVerifiedAlias("Lee U Fan")).toBe("lee-ufan");
    expect(resolveVerifiedAlias("이우환")).toBe("lee-ufan");
    expect(finishSearch({ ok: true, results: [lee] })).toBe("success");
  });

  it("shows an empty state for an undocumented name", () => {
    expect(resolveVerifiedAlias("김홍도")).toBeNull();
    expect(finishSearch({ ok: true, results: [] })).toBe("empty");
    expect(SEARCH_EMPTY_COPY).toBe("No documented artist matches that name yet.");
  });

  it("returns the search body before a slow missing-search write", async () => {
    const body = historySearchBody([]);
    let released = false;
    let release: () => void = () => {};
    const pending = persistMissingSearch({
      query: "김홍도",
      event: "SEARCH_NO_RESULT",
      write: () => new Promise((resolve) => {
        release = () => {
          released = true;
          resolve();
        };
      }),
    });
    expect(body).toEqual({ results: [], unavailable: false });
    expect(released).toBe(false);
    release();
    await expect(pending).resolves.toBe("recorded");
  });

  it("still returns an empty 200 body when the analytics write fails", async () => {
    const outcome = await persistMissingSearch({
      query: "김홍도",
      event: "SEARCH_NO_RESULT",
      write: async () => {
        throw new Error("database unavailable");
      },
    });
    expect(outcome).toBe("failed");
    expect(historySearchBody([])).toEqual({ results: [], unavailable: false });
    expect(readFileSync("app/api/history/search/route.ts", "utf8")).not.toMatch(/historySignal|recordMissingSearch/);
  });

  it("keeps one same-query submit in flight", () => {
    const first = claimSubmit(null, "김홍도");
    const second = claimSubmit(first.query, "김홍도");
    const changed = claimSubmit(first.query, "Lee Ufan");
    expect(first.proceed).toBe(true);
    expect(second.proceed).toBe(false);
    expect(changed.proceed).toBe(true);
  });

  it("drops a stale autocomplete response", () => {
    expect(acceptAutocomplete("김", "김홍도", false)).toBe(false);
    expect(acceptAutocomplete("김홍도", "김홍도", true)).toBe(false);
    expect(acceptAutocomplete("Lee Ufan", "Lee Ufan", false)).toBe(true);
  });

  it("reuses a completed autocomplete query and surfaces network failure", () => {
    expect(reuseCompletedSearch("김홍도", "김홍도")).toBe(true);
    expect(reuseCompletedSearch("김홍도", "Lee Ufan")).toBe(false);
    expect(finishSearch({ ok: false, results: [] })).toBe("error");
    expect(SEARCH_ERROR_COPY).toContain("temporarily unavailable");
    expect(SEARCH_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(8_000);
    expect(SEARCH_CLIENT_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });
});
