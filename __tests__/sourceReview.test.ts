import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { historyCopy, historyOriginLabel } from "@/lib/history/locale";
import {
  aggregateSourceClearance,
  firstPartyWrite,
  recordIsPublic,
  sourceIsPubliclyVisible,
} from "@/lib/history/policy";
import { toExhibitionView } from "@/lib/history/queries";

function exhibition(input: {
  origin?: string;
  sourceClearance: string;
  sources: {
    url: string;
    sourceName: string;
    sourceType: string;
    clearanceStatus: string;
    internalUseDecision?: string;
    contentScope?: string;
  }[];
}) {
  return {
    id: "exhibition-1",
    title: "Room",
    startDate: null,
    endDate: null,
    city: null,
    country: null,
    createdBy: null,
    space: null,
    curator: null,
    historyMeta: {
      slug: "room",
      datePrecision: "YEAR",
      startYear: 2024,
      startMonth: null,
      startDay: null,
      endYear: null,
      endMonth: null,
      endDay: null,
      clearanceStatus: "REVIEW_REQUIRED",
      contributorKind: "artist",
      publicationStatus: "PUBLIC",
      origin: input.origin ?? "ARTIST_SUBMITTED",
      sourceClearance: input.sourceClearance,
    },
    historySources: input.sources.map((source, index) => ({
      source: {
        id: `source-${index}`,
        url: source.url,
        sourceName: source.sourceName,
        sourceType: source.sourceType,
        clearanceStatus: source.clearanceStatus,
        internalUseDecision: source.internalUseDecision ?? "HOLD",
        externalPermission: "NOT_OBTAINED",
        contentScope: source.contentScope ?? "UNSPECIFIED",
      },
    })),
    historyArtists: [],
    unresolvedNames: [],
  };
}

describe("submitted source review", () => {
  it("keeps an approved artist's new exhibition public while the typed URL stays under review", () => {
    const write = firstPartyWrite({ claimApproved: true, hasExternalSource: true });
    expect(write).toMatchObject({
      origin: "ARTIST_SUBMITTED",
      publicationStatus: "PUBLIC",
      isPublic: true,
      sourceClearance: "REVIEW_REQUIRED",
    });
    expect(recordIsPublic(write)).toBe(true);
    expect(sourceIsPubliclyVisible({
      sourceType: "submitted-url",
      clearanceStatus: "REVIEW_REQUIRED",
      internalUseDecision: "HOLD",
      contentScope: "UNSPECIFIED",
    })).toBe(false);
  });

  it("aggregates several sources without treating one rejection as the whole exhibition", () => {
    expect(aggregateSourceClearance([])).toBe("NOT_APPLICABLE");
    expect(aggregateSourceClearance(["NOT_APPLICABLE"])).toBe("NOT_APPLICABLE");
    expect(aggregateSourceClearance(["REVIEW_REQUIRED"])).toBe("REVIEW_REQUIRED");
    expect(aggregateSourceClearance(["APPROVED", "REJECTED"])).toBe("APPROVED");
    expect(aggregateSourceClearance(["REJECTED", "REVIEW_REQUIRED"])).toBe("REVIEW_REQUIRED");
    expect(aggregateSourceClearance(["REJECTED", "REJECTED"])).toBe("REJECTED");
  });

  it("shows only the approved source and keeps the artist as the record origin", () => {
    const view = toExhibitionView(exhibition({
      sourceClearance: "APPROVED",
      sources: [
        { url: "https://gallery.example/a", sourceName: "Gallery A", sourceType: "submitted-url", clearanceStatus: "APPROVED" },
        { url: "https://hidden.example/b", sourceName: "Hidden B", sourceType: "submitted-url", clearanceStatus: "REJECTED" },
        { url: "https://pending.example/c", sourceName: "Pending C", sourceType: "submitted-url", clearanceStatus: "REVIEW_REQUIRED" },
      ],
    }) as never);
    expect(view.origin).toBe("ARTIST_SUBMITTED");
    expect(view.sources.map((source) => source.url)).toEqual(["https://gallery.example/a"]);
  });

  it("keeps a first-party record public after every submitted URL is rejected", () => {
    expect(recordIsPublic({
      publicationStatus: "PUBLIC",
      origin: "ARTIST_SUBMITTED",
      sourceClearance: "REJECTED",
    })).toBe(true);
    expect(recordIsPublic({
      publicationStatus: "PUBLIC",
      origin: "ROB_RESEARCHED",
      sourceClearance: "REJECTED",
    })).toBe(false);
    const view = toExhibitionView(exhibition({
      sourceClearance: "REJECTED",
      sources: [
        { url: "https://hidden.example/rejected", sourceName: "Rejected", sourceType: "submitted-url", clearanceStatus: "REJECTED" },
      ],
    }) as never);
    expect(view.origin).toBe("ARTIST_SUBMITTED");
    expect(view.sources).toEqual([]);
    expect(historyOriginLabel("ko", view.origin)).toBe("작가 등록");
    expect(historyCopy("ko").noSource).toBe("출처 없음");
    expect(historyCopy("ko").originArtist).not.toContain("공식");
  });

  it("leaves an exhibition without a URL public and without a source link", () => {
    const write = firstPartyWrite({ claimApproved: true, hasExternalSource: false });
    expect(write.sourceClearance).toBe("NOT_APPLICABLE");
    const view = toExhibitionView(exhibition({ sourceClearance: "NOT_APPLICABLE", sources: [] }) as never);
    expect(recordIsPublic(write)).toBe(true);
    expect(view.sources).toEqual([]);
    expect(view.origin).toBe("ARTIST_SUBMITTED");
  });

  it("still shows an already-cleared factual research source that is not a submitted URL", () => {
    expect(sourceIsPubliclyVisible({
      sourceType: "gallery-page",
      clearanceStatus: "REVIEW_REQUIRED",
      internalUseDecision: "ALLOW_LIMITED",
      contentScope: "FACTUAL_METADATA_ONLY",
    })).toBe(true);
    expect(sourceIsPubliclyVisible({
      sourceType: "submitted-url",
      clearanceStatus: "REVIEW_REQUIRED",
      internalUseDecision: "ALLOW_LIMITED",
      contentScope: "FACTUAL_METADATA_ONLY",
    })).toBe(false);
  });

  it("keeps review behind the admin guard and does not rewrite the record origin", () => {
    const list = readFileSync("app/api/admin/history/sources/route.ts", "utf8");
    const review = readFileSync("app/api/admin/history/sources/[id]/review/route.ts", "utf8");
    const model = readFileSync("lib/history/sourceReview.ts", "utf8");
    const graph = readFileSync("lib/history/publicGraph.ts", "utf8");
    expect(list).toContain("requireAdminSession");
    expect(review).toContain("requireAdminSession");
    expect(review).toContain("revalidateTag(PUBLIC_HISTORY_CACHE_TAG)");
    expect(review).not.toContain("publicationStatus");
    expect(model).toContain("aggregateSourceClearance");
    expect(model).not.toContain("origin: input");
    expect(model).not.toContain("publicationStatus: input");
    expect(model).toContain('data: { clearanceStatus: input.decision }');
    expect(model).toContain("data: { sourceClearance }");
    expect(graph).toContain("source.\"sourceType\" = 'submitted-url' AND source.\"clearanceStatus\" = 'APPROVED'");
  });
});
