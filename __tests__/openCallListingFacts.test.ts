import { describe, expect, it } from "vitest";
import { applyDestination, costLines, costSummary, deadlineStatus, listingFacts, locationLine } from "@/lib/openCall/listingFacts";

const spacenamu = {
  city: "Seoul",
  theme: "스페이스나무 미술관 등록 기념 초대작가 공모(2026-11-07~2026-12-07)",
  galleryDescription:
    "접수일정 ▶ 2026-11-07~2026-12-07 주관 ▶ 스페이스나무 뮤지엄 주소 ▶ 경상남도 양산시 하북면 충렬로 1733 연락처 ▶ 055-374-3500 이메일 ▶ spacenamu_@naver.com 홈페이지 ▶ http://www.spacenamu.net 미술작품 공모전을 개최합니다.",
  externalUrl: "https://blog.naver.com/venice87/224467094699?fromRss=true",
  galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
  externalEmail: "editor@k-artblog.kr",
};

describe("open call listing facts", () => {
  it("reads the organizer from a reprinted notice and does not email the feed publisher", () => {
    const facts = listingFacts(spacenamu);
    expect(facts.sourceRole).toBe("reprint");
    expect(facts.organizerUrl).toBe("http://www.spacenamu.net");
    expect(facts.organizerEmail).toBe("spacenamu_@naver.com");
    expect(facts.statedPlace).toContain("양산시");
    expect(facts.cityNeedsCheck).toBe(true);
    expect(facts.organizerName).toBe("스페이스나무 뮤지엄");
    expect(facts.kind).toBe("공모전");
    expect(applyDestination(facts, spacenamu.externalUrl)?.kind).toBe("official");
    expect(facts.fee).toBeNull();
    expect(facts.support).toBeNull();
    expect(facts.canEmailOrganizer).toBe(false);
    expect(facts.websiteIsFeed).toBe(true);
  });

  it("does not turn a bare open call into a competition or invent a fee", () => {
    const facts = listingFacts({
      city: "Seoul",
      theme: "2027 엠아트센터 창작활동 지원작가 모집 공고",
      galleryDescription: "접수일정 ▶ 2026-11-09~2026-11-29 주관 ▶ 엠아트센터",
      externalUrl: "https://blog.naver.com/venice87/1",
      galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
      externalEmail: "editor@k-artblog.kr",
    });
    expect(facts.kind).toBeNull();
    expect(facts.fee).toBeNull();
    expect(facts.support).toBeNull();
    expect(facts.canEmailOrganizer).toBe(false);
  });

  it("does not email a directory listing unless the notice itself names that address", () => {
    const facts = listingFacts({
      city: "Tokyo",
      theme: "Sado Island International Artist Residency",
      galleryDescription: "The program provides accommodation for selected artists.",
      externalUrl: "https://air-j.info/en/program/sado-island-international-artist-residency/",
      galleryWebsite: "https://air-j.info/en/program/",
      externalEmail: "contact@sia-promotion.org",
    });
    expect(facts.sourceRole).toBe("direct");
    expect(facts.kind).toBe("레지던시");
    expect(facts.support).toMatch(/accommodation/i);
    expect(facts.canEmailOrganizer).toBe(false);
    expect(facts.cityNeedsCheck).toBe(false);
    expect(locationLine(facts, "Tokyo").text).toBe("Tokyo");
  });

  it("emails only a non-reprint address that the notice labels as the organizer email", () => {
    const facts = listingFacts({
      city: "Tokyo",
      theme: "Sado Island International Artist Residency",
      galleryDescription: "이메일 ▶ contact@sia-promotion.org",
      externalUrl: "https://air-j.info/en/program/sado-island-international-artist-residency/",
      galleryWebsite: "https://air-j.info/en/program/",
      externalEmail: "contact@sia-promotion.org",
    });
    expect(facts.canEmailOrganizer).toBe(true);
  });

  it("keeps a free application fee separate from unconfirmed participation costs", () => {
    const facts = listingFacts({
      city: "Seoul",
      theme: "참여 공모",
      galleryDescription: "참가비 ▶ 무료 선정 후 참가비 ▶ 50,000원 운송비 작가 부담 판매 수수료 ▶ 30%",
      externalUrl: "https://blog.naver.com/venice87/9",
    });
    expect(costSummary(facts)).toBe("지원비 없음 · 선정 후 참가비 50,000원 · 운송·설치 작가 부담 · 판매 수수료 30%");
    expect(costLines(facts).map((line) => [line.key, line.value])).toEqual([
      ["application", "없음"],
      ["participation", "50,000원"],
      ["shipping", "작가 부담"],
      ["commission", "30%"],
      ["other", "미확인"],
    ]);
    expect(costSummary(facts)).not.toBe("무료");
  });

  it("sends a reprinted notice link ahead of the aggregator when no official site is named", () => {
    const facts = listingFacts({
      city: "Seoul",
      theme: "갤러리한옥",
      galleryDescription: "주관 ▶ 갤러리한옥 홈페이지 ▶ https://blog.naver.com/gallery_hanok/1",
      externalUrl: "https://blog.naver.com/venice87/1",
    });
    expect(facts.officialApplicationUrl).toBeNull();
    expect(applyDestination(facts, "https://blog.naver.com/venice87/1")).toEqual({
      href: "https://blog.naver.com/gallery_hanok/1",
      kind: "notice",
    });
  });

  it("treats the deadline date as still open through the end of that day", () => {
    expect(deadlineStatus("2026-11-16", new Date("2026-11-16T10:00:00+09:00"))).toBe("open");
    expect(deadlineStatus("2026-11-15", new Date("2026-11-16T10:00:00+09:00"))).toBe("closed");
    expect(deadlineStatus("soon")).toBe("unknown");
  });

  it("does not treat a blank reprint address or a Naver homepage as confirmed", () => {
    const facts = listingFacts({
      city: "Seoul",
      theme: "오산 내삼미2구역 미술작품 선정 공모",
      galleryDescription: "주소 ▶ 연락처 ▶ 홍길동 홈페이지 ▶ https://blog.naver.com/example/1",
      externalUrl: "https://blog.naver.com/venice87/1",
      galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
      externalEmail: "editor@k-artblog.kr",
    });
    expect(facts.cityNeedsCheck).toBe(true);
    expect(locationLine(facts, "Seoul").text).toBe("위치 확인 필요");
    expect(facts.officialApplicationUrl).toBeNull();
    expect(facts.canEmailOrganizer).toBe(false);
  });
});
