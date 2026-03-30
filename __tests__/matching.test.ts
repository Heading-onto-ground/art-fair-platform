import { describe, it, expect } from "vitest";

/**
 * Open-call 매칭 알고리즘 테스트
 * /app/open-calls/page.tsx의 scoreMatch 함수 로직과 동일
 */
function scoreMatch(
  artist: { country?: string | null; genre?: string | null; city?: string | null; bio?: string | null },
  openCall: { country: string; theme: string; city: string }
): number {
  let score = 0;

  // 국가 일치: 35점
  if (artist.country && artist.country.toLowerCase() === openCall.country.toLowerCase()) {
    score += 35;
  }

  // 장르/테마 일치: 40점 (부분 매치 포함)
  if (artist.genre && openCall.theme) {
    const g = artist.genre.toLowerCase();
    const t = openCall.theme.toLowerCase();
    if (g === t || t.includes(g) || g.includes(t)) {
      score += 40;
    } else {
      // 단어 단위 매칭
      const gWords = g.split(/\W+/).filter(Boolean);
      const tWords = t.split(/\W+/).filter(Boolean);
      const matched = gWords.filter((w) => tWords.includes(w)).length;
      if (matched > 0) score += Math.round(20 * (matched / Math.max(gWords.length, tWords.length)));
    }
  }

  // 도시 일치: 15점
  if (artist.city && artist.city.toLowerCase() === openCall.city.toLowerCase()) {
    score += 15;
  }

  // bio 키워드 매치: 10점
  if (artist.bio && openCall.theme) {
    const bio = artist.bio.toLowerCase();
    const theme = openCall.theme.toLowerCase();
    if (bio.includes(theme) || theme.split(/\W+/).some((w) => w.length > 3 && bio.includes(w))) {
      score += 10;
    }
  }

  return score;
}

describe("Open-call 매칭 알고리즘", () => {
  const openCall = { country: "KR", theme: "contemporary painting", city: "Seoul" };

  it("국가+장르+도시 완전 일치는 최고점", () => {
    const artist = { country: "KR", genre: "contemporary painting", city: "Seoul", bio: "I work with contemporary painting techniques" };
    const score = scoreMatch(artist, openCall);
    expect(score).toBe(100); // 35 + 40 + 15 + 10
  });

  it("국가만 일치하면 35점", () => {
    const artist = { country: "KR", genre: "sculpture", city: "Busan", bio: null };
    const score = scoreMatch(artist, openCall);
    expect(score).toBe(35);
  });

  it("장르만 일치하면 40점", () => {
    const artist = { country: "US", genre: "contemporary painting", city: "New York", bio: null };
    const score = scoreMatch(artist, openCall);
    expect(score).toBe(40);
  });

  it("아무것도 일치하지 않으면 0점", () => {
    const artist = { country: "JP", genre: "video art", city: "Tokyo", bio: "digital media" };
    const score = scoreMatch(artist, openCall);
    expect(score).toBe(0);
  });

  it("도시 일치는 15점", () => {
    const artist = { country: "JP", genre: "sculpture", city: "Seoul", bio: null };
    const score = scoreMatch(artist, openCall);
    expect(score).toBe(15);
  });

  it("bio 키워드 포함은 10점 추가", () => {
    const artist = { country: "JP", genre: "sculpture", city: "Tokyo", bio: "I work with contemporary painting" };
    const score = scoreMatch(artist, openCall);
    expect(score).toBe(10);
  });

  it("null 필드는 점수에 영향 없음", () => {
    const artist = { country: null, genre: null, city: null, bio: null };
    const score = scoreMatch(artist, openCall);
    expect(score).toBe(0);
  });

  it("대소문자 무시", () => {
    const artist = { country: "kr", genre: "CONTEMPORARY PAINTING", city: "SEOUL", bio: null };
    const score = scoreMatch(artist, openCall);
    expect(score).toBeGreaterThanOrEqual(35 + 40 + 15);
  });
});
