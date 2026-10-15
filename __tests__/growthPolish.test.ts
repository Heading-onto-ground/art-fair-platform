import { describe, expect, it } from "vitest";
import { pluralCount } from "@/lib/history/copy";
import { aliasSlugRedirect, searchDemandQuery } from "@/lib/history/identity";
import { HISTORY_EVENTS, missingSearchEvent } from "@/lib/history/policy";

describe("count copy", () => {
  it("uses the singular word for one and the plural for more", () => {
    expect(pluralCount(1, "exhibition")).toBe("1 exhibition");
    expect(pluralCount(2, "exhibition")).toBe("2 exhibitions");
    expect(pluralCount(0, "exhibition")).toBe("0 exhibitions");
    expect(pluralCount(1, "documented shared exhibition")).toBe("1 documented shared exhibition");
    expect(pluralCount(3, "documented shared exhibition")).toBe("3 documented shared exhibitions");
    expect(pluralCount(1, "record")).toBe("1 record");
    expect(pluralCount(2, "record")).toBe("2 records");
    expect(pluralCount(1, "artist")).toBe("1 artist");
    expect(pluralCount(4, "artist")).toBe("4 artists");
    expect(pluralCount(1, "documented exhibition")).toBe("1 documented exhibition");
    expect(pluralCount(2, "documented exhibition")).toBe("2 documented exhibitions");
  });
});

describe("alias slug redirect", () => {
  it("sends verified spelling variants to the canonical slug", () => {
    expect(aliasSlugRedirect("lee-u-fan")).toBe("lee-ufan");
    expect(aliasSlugRedirect("park-seobo")).toBe("park-seo-bo");
    expect(aliasSlugRedirect("ha-chonghyun")).toBe("ha-chong-hyun");
    expect(aliasSlugRedirect("chung-sanghwa")).toBe("chung-sang-hwa");
    expect(aliasSlugRedirect("yun-hyongkeun")).toBe("yun-hyong-keun");
    expect(aliasSlugRedirect("kim-tschangyeul")).toBe("kim-tschang-yeul");
  });

  it("leaves the canonical slug and unrelated names alone", () => {
    expect(aliasSlugRedirect("lee-ufan")).toBeNull();
    expect(aliasSlugRedirect("park-seo-bo")).toBeNull();
    expect(aliasSlugRedirect("lee-fan")).toBeNull();
    expect(aliasSlugRedirect("ha-chong-hyun")).toBeNull();
  });
});

describe("missing search demand", () => {
  it("keeps a normalized query and drops identifiers", () => {
    expect(searchDemandQuery("  Lee   U-Fan ")).toBe("lee u fan");
    expect(searchDemandQuery("Kim")).toBe("kim");
    expect(searchDemandQuery("le")).toBeNull();
    expect(searchDemandQuery("artist@example.com")).toBeNull();
    expect(HISTORY_EVENTS).toContain("SEARCH_NO_RESULT");
    expect(missingSearchEvent(false)).toBe("SEARCH_NO_RESULT");
    expect(missingSearchEvent(true)).toBe("SEARCH_NO_RESULT_OPERATOR");
    expect(HISTORY_EVENTS).not.toContain("SEARCH_NO_RESULT_OPERATOR");
  });
});
