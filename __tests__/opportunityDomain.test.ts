import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { backfillOpportunities, type OpportunityWriteStore, type StoredOpportunity } from "@/lib/opportunity/backfill";
import { opportunityCycleKey, opportunityFingerprint } from "@/lib/opportunity/fingerprint";
import { classifyOpenCall, draftOpportunity, type LegacyOpenCallInput } from "@/lib/opportunity/fromOpenCall";
import { isPublicOpportunity } from "@/lib/opportunity/publicPolicy";

const NOW = new Date("2026-11-16T12:00:00Z");

const spacenamu: LegacyOpenCallInput = {
  id: "space-1",
  gallery: "스페이스나무 미술관 등록 기념 초대작가 공모",
  city: "Seoul",
  country: "한국",
  theme: "스페이스나무 미술관 등록 기념 초대작가 공모(2026-11-07~2026-12-07)",
  deadline: "2026-12-07",
  isExternal: true,
  externalUrl: "https://blog.naver.com/venice87/224467094699",
  galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
  galleryDescription: "접수일정 ▶ 2026-11-07~2026-12-07 주관 ▶ 스페이스나무 뮤지엄 주소 ▶ 경상남도 양산시 하북면 충렬로 1733 홈페이지 ▶ http://www.spacenamu.net 미술작품 공모전",
};

const six: LegacyOpenCallInput[] = [
  spacenamu,
  {
    id: "mart-1",
    gallery: "2027 엠아트센터 창작활동 지원작가 모집 공고",
    city: "Seoul",
    country: "한국",
    theme: "2027 엠아트센터 창작활동 지원작가 모집 공고(2026-11-09~2026-11-29)",
    deadline: "2026-11-29",
    isExternal: true,
    externalUrl: "https://blog.naver.com/venice87/224472498484",
    galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
    galleryDescription: "접수일정 ▶ 2026-11-09~2026-11-29 주관 ▶ 엠아트센터 주소 ▶ 서울특별시 송파구 문정동 150-2 홈페이지 ▶ https://blog.naver.com/mart-/224471430491 기획전 참여",
  },
  {
    id: "misa-1",
    gallery: "2027 미사장 갤러리 작가공모_남영, 하남",
    city: "Seoul",
    country: "한국",
    theme: "2027 미사장 갤러리 작가공모_남영, 하남(2026-11-10~2026-12-31)",
    deadline: "2026-12-31",
    isExternal: true,
    externalUrl: "https://blog.naver.com/venice87/224471313881",
    galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
    galleryDescription: "접수일정 ▶ 2026-11-10~2026-12-31 주관 ▶ MISAJANG 미사장 주소 ▶ 서울 용산구 한강대로84길 21-9 홈페이지 ▶ https://www.misajang.com 전시 개요",
  },
  {
    id: "hanok-1",
    gallery: "2027 갤러리한옥 불화·민화 공모전",
    city: "Seoul",
    country: "한국",
    theme: "2027 갤러리한옥 불화·민화 공모전(2027-01-01~2027-01-15)",
    deadline: "2027-01-15",
    isExternal: true,
    externalUrl: "https://blog.naver.com/venice87/224467193309",
    galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
    galleryDescription: "접수일정 ▶ 2027-01-01~2027-01-15 주관 ▶ 갤러리한옥 주소 ▶ 서울시 종로구 북촌로11길4 홈페이지 ▶ https://blog.naver.com/gallery_hanok/1 불화 민화 공모전",
  },
  {
    id: "osan-1",
    gallery: "오산 내삼미2구역 A2블럭 공동주택 신축공사 미술작품 선정 공모 공고",
    city: "Seoul",
    country: "한국",
    theme: "오산 내삼미2구역 A2블럭 공동주택 신축공사 미술작품 선정 공모 공고(2026-11-13~2026-12-04)",
    deadline: "2026-12-04",
    isExternal: true,
    externalUrl: "https://blog.naver.com/venice87/224475465621",
    galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
    galleryDescription: "접수일정 ▶ 2026-11-13~2026-12-04 주관 ▶ 한국투자부동산신탁(주) 주소 ▶ 연락처 ▶ 담당자 홈페이지 ▶ https://www.gg.go.kr/publicart/bbs/boardView.do?bsIdx=825",
  },
  {
    id: "airj-1",
    gallery: "AIR_J : Online Database of Artist in Residence Programs in Japan",
    city: "Tokyo",
    country: "일본",
    theme: "SADO ISLAND INTERNATIONAL ARTIST RESIDENCY The Sado Island International Art Promotion Organization is looking for artists to stay and produce on Sado Island.",
    deadline: "2027-02-01",
    isExternal: true,
    externalUrl: "https://air-j.info/en/program/sado-island-international-artist-residency/",
    galleryWebsite: "https://air-j.info/en/program/",
    galleryDescription: "AIR_J Residency Network curated open-call listing.",
  },
];

function memoryStore(): OpportunityWriteStore & { rows: StoredOpportunity[] } {
  const rows: StoredOpportunity[] = [];
  const sources: Array<{ opportunityId: string; legacyOpenCallId: string }> = [];
  return {
    rows,
    async findByLegacyOpenCallId(id) {
      return rows.find((row) => row.legacyOpenCallId === id)
        || rows.find((row) => sources.some((source) => source.opportunityId === row.id && source.legacyOpenCallId === id))
        || null;
    },
    async findByFingerprint(fingerprint) {
      return rows.find((row) => row.fingerprint === fingerprint) || null;
    },
    async findByCycleKey(cycleKey) {
      return rows.find((row) => row.cycleKey === cycleKey) || null;
    },
    async insert(draft) {
      const row: StoredOpportunity = {
        id: `opp-${rows.length + 1}`,
        fingerprint: draft.fingerprint,
        cycleKey: draft.cycleKey,
        legacyOpenCallId: draft.legacyOpenCallId,
        verificationStatus: draft.verificationStatus,
      };
      rows.push(row);
      return row;
    },
    async ensureSource(opportunityId, draft) {
      if (!sources.some((source) => source.legacyOpenCallId === draft.legacyOpenCallId)) {
        sources.push({ opportunityId, legacyOpenCallId: draft.legacyOpenCallId });
      }
    },
  };
}

describe("opportunity domain", () => {
  it("keeps a missing fee unknown and does not treat the blog account as the organizer", () => {
    const draft = draftOpportunity(spacenamu, NOW);
    expect(draft?.feeRequired).toBeNull();
    expect(draft?.feeAmount).toBeNull();
    expect(draft?.eligibility).toBeNull();
    expect(draft?.organizerName).toBe("스페이스나무 뮤지엄");
    expect(draft?.organizerType).toBe("MUSEUM");
    expect(draft?.city).toBe("양산시");
    expect(draft?.country).toBe("한국");
    expect(draft?.officialUrl).toBe("http://www.spacenamu.net");
    expect(draft?.sourceHost).toBe("blog.naver.com");
    expect(draft?.sourceClass).toBe("REPRINT");
    expect(draft?.type).toBe("PRIZE");
    expect(draft?.status).toBe("OPEN");
    expect(draft?.verificationStatus).toBe("VERIFIED_AGGREGATOR");
    expect(isPublicOpportunity(draft!)).toBe(true);
  });

  it("does not copy an unsupported stored city", () => {
    const osan = draftOpportunity(six[4], NOW);
    const air = draftOpportunity(six[5], NOW);
    expect(osan?.city).toBeNull();
    expect(osan?.type).toBe("PUBLIC_ART");
    expect(osan?.officialUrl).toContain("gg.go.kr");
    expect(osan?.organizerName).toBe("한국투자부동산신탁(주)");
    expect(air?.city).toBeNull();
    expect(air?.locationText).toBe("Sado Island");
    expect(air?.country).toBe("일본");
    expect(air?.organizerName).toBe("Sado Island International Art Promotion Organization");
    expect(air?.type).toBe("RESIDENCY");
    expect(air?.sourceClass).toBe("DIRECTORY");
    expect(air?.officialUrl).toBeNull();
    const mart = draftOpportunity(six[1], NOW);
    const misa = draftOpportunity(six[2], NOW);
    const hanok = draftOpportunity(six[3], NOW);
    expect(mart).toMatchObject({ type: "EXHIBITION", organizerName: "엠아트센터", city: "서울", officialUrl: null, sourceClass: "REPRINT" });
    expect(misa).toMatchObject({ type: "EXHIBITION", organizerName: "MISAJANG 미사장", city: "서울", sourceClass: "REPRINT" });
    expect(misa?.officialUrl).toBe("https://www.misajang.com");
    expect(hanok).toMatchObject({ type: "PRIZE", organizerName: "갤러리한옥", city: "서울", disciplines: "불화, 민화", officialUrl: null });
    const chungju = draftOpportunity({
      id: "chungju-1",
      gallery: "2026 충주문화예술지원사업 대외활동 참가비 지원 공고",
      city: "Seoul",
      country: "한국",
      theme: "2026 충주문화예술지원사업 대외활동 참가비 지원 공고_공모전 · 대회 · 콩쿠르 등(2026-03-13~2026-11-30)",
      deadline: "2026-11-30",
      isExternal: true,
      externalUrl: "https://blog.naver.com/venice87/224478585489",
      galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
      galleryDescription: "접수일정 ▶ 2026-03-13~2026-11-30 주관 ▶ 충주문화관광재단 주소 ▶ 충북 충주시 중앙로 128 2층 홈페이지 ▶ https://cjcf.or.kr/new/bbs/board.php?bo_table=offering&wr_id=44",
    }, NOW);
    expect(chungju).toMatchObject({
      type: "GRANT",
      organizerName: "충주문화관광재단",
      organizerType: "ORGANIZATION",
      country: "한국",
      city: "충주시",
      sourceClass: "REPRINT",
      verificationStatus: "VERIFIED_AGGREGATOR",
    });
    expect(chungju?.officialUrl).toContain("cjcf.or.kr");
    expect(chungju?.city).not.toBe("Seoul");
  });

  it("splits fingerprints by organizer and by deadline", () => {
    const first = opportunityFingerprint({
      organizerName: "스페이스나무 뮤지엄",
      title: "초대작가 공모",
      deadline: "2026-12-07",
      officialUrl: "http://www.spacenamu.net",
    });
    const otherOrganizer = opportunityFingerprint({
      organizerName: "갤러리한옥",
      title: "초대작가 공모",
      deadline: "2026-12-07",
      officialUrl: "http://www.spacenamu.net",
    });
    const nextCycle = opportunityFingerprint({
      organizerName: "스페이스나무 뮤지엄",
      title: "초대작가 공모",
      deadline: "2027-12-07",
      officialUrl: "http://www.spacenamu.net",
    });
    expect(first).not.toBe(otherOrganizer);
    expect(first).not.toBe(nextCycle);
    expect(opportunityCycleKey({
      organizerName: "스페이스나무 뮤지엄",
      title: "초대작가 공모",
      deadline: "2026-12-07",
    })).toBe(opportunityCycleKey({
      organizerName: " 스페이스나무   뮤지엄 ",
      title: "초대작가 공모",
      deadline: "2026-12-07",
    }));
  });

  it("classifies every legacy shape and backfills only real calls once", async () => {
    const calls: LegacyOpenCallInput[] = [
      ...six,
      { id: "oc_001", gallery: "Aurora Gallery", city: "Seoul", country: "한국", theme: "Spring", deadline: "2026-03-15", isExternal: false },
      { id: "demo-1", gallery: "noas", city: "Seould", country: "한국", theme: "test", deadline: "2026-08-07", isExternal: false },
      { id: "demo-2", gallery: "noas", city: "seoul", country: "한국", theme: "test", deadline: "2026.09.05", isExternal: false },
    ];
    expect(calls.map((call) => classifyOpenCall(call, NOW))).toEqual([
      "VALID_EXTERNAL",
      "VALID_EXTERNAL",
      "VALID_EXTERNAL",
      "VALID_EXTERNAL",
      "VALID_EXTERNAL",
      "VALID_EXTERNAL",
      "SYNTHETIC_SEED",
      "TEST_OR_DEMO",
      "TEST_OR_DEMO",
    ]);
    const store = memoryStore();
    const first = await backfillOpportunities(calls, store, NOW);
    const second = await backfillOpportunities(calls, store, NOW);
    expect(first.inserted).toBe(6);
    expect(first.skipped).toBe(3);
    expect(first.reviewRequired).toBe(0);
    expect(second.inserted).toBe(0);
    expect(second.linked).toBe(6);
    expect(store.rows.every((row) => isPublicOpportunity({ status: "OPEN", verificationStatus: row.verificationStatus }))).toBe(true);
  });

  it("links a second source to the same cycle instead of creating another opportunity", async () => {
    const store = memoryStore();
    const reprint = spacenamu;
    const direct: LegacyOpenCallInput = {
      ...spacenamu,
      id: "space-direct",
      externalUrl: "http://www.spacenamu.net/open-call",
      galleryWebsite: "http://www.spacenamu.net",
    };
    const result = await backfillOpportunities([reprint, direct], store, NOW);
    expect(result.inserted).toBe(1);
    expect(result.linked).toBe(1);
    expect(store.rows).toHaveLength(1);
  });

  it("locks the new tables and leaves the legacy preparation route in place", () => {
    const sql = fs.readFileSync(path.join(process.cwd(), "prisma/sql/add-opportunity-domain.sql"), "utf8");
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain("REVOKE ALL ON TABLE \"Opportunity\" FROM anon, authenticated, PUBLIC");
    expect(sql).toContain("REVOKE ALL ON TABLE \"OpportunitySource\" FROM anon, authenticated, PUBLIC");
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    const preparation = fs.readFileSync(path.join(process.cwd(), "app/api/open-calls/[id]/preparation/route.ts"), "utf8");
    expect(preparation).toContain("getServerSession");
    expect(preparation).not.toContain("body.userId");
    const crawl = fs.readFileSync(path.join(process.cwd(), "lib/openCall/crawlRecovery.ts"), "utf8");
    expect(crawl).toContain("if (input.readOnly)");
  });
});
