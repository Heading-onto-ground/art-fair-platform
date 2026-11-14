import { describe, expect, it } from "vitest";
import { listingFacts, locationLine } from "@/lib/openCall/listingFacts";

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
    expect(facts.kind).toBe("공모전");
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
