import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  DEMAND_SEPARATION_AT,
  classifyStoredDemand,
  countsAsFrontierDemand,
  demandEventName,
  demandWriteClass,
} from "@/lib/history/demandQuality";

describe("search demand quality", () => {
  it("ignores a client operator flag and uses the server context", () => {
    expect(demandWriteClass({ adminSession: false, nodeEnv: "production" })).toBe("REAL_VISITOR");
    expect(demandWriteClass({ adminSession: true, nodeEnv: "production" })).toBe("OPERATOR");
    expect(demandWriteClass({ adminSession: false, nodeEnv: "test" })).toBe("QA_TEST");
    expect(demandEventName("REAL_VISITOR")).toBe("SEARCH_NO_RESULT");
    expect(demandEventName("OPERATOR")).toBe("SEARCH_NO_RESULT_OPERATOR");
    expect(demandEventName("QA_TEST")).toBe("SEARCH_NO_RESULT_QA");
    const route = readFileSync("app/api/history/missing-search/route.ts", "utf8");
    expect(route).not.toMatch(/body\.operator/);
    expect(route).toContain("getAdminSession");
  });

  it("keeps a real name after the split and parks older rows as mixed", () => {
    expect(classifyStoredDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-17T00:00:00.000Z",
      query: "김홍도",
    })).toBe("REAL_VISITOR");
    expect(classifyStoredDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-14T00:00:00.000Z",
      query: "김홍도",
    })).toBe("LEGACY_MIXED");
    expect(classifyStoredDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-14T00:00:00.000Z",
      query: "pending check name",
    })).toBe("INVALID_QUERY");
    expect(classifyStoredDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-14T00:00:00.000Z",
      query: "zzzz no artist",
    })).toBe("INVALID_QUERY");
    expect(countsAsFrontierDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: DEMAND_SEPARATION_AT,
      query: "김홍도",
    })).toBe(true);
    expect(classifyStoredDemand({
      name: "SEARCH_NO_RESULT_OPERATOR",
      createdAt: "2026-10-17T00:00:00.000Z",
      query: "김홍도",
    })).toBe("OPERATOR");
    expect(classifyStoredDemand({
      name: "SEARCH_NO_RESULT_QA",
      createdAt: "2026-10-17T00:00:00.000Z",
      query: "pending check name",
    })).toBe("QA_TEST");
    expect(classifyStoredDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-17T00:00:00.000Z",
      query: "a",
    })).toBe("INVALID_QUERY");
    expect(countsAsFrontierDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-15T16:42:09.245Z",
      query: "pending check name",
    })).toBe(false);
    expect(countsAsFrontierDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-15T16:41:47.570Z",
      query: "zzzz no artist",
    })).toBe(false);
    expect(countsAsFrontierDemand({
      name: "SEARCH_NO_RESULT",
      createdAt: "2026-10-15T16:45:25.453Z",
      query: "김홍도",
    })).toBe(true);
  });
});
