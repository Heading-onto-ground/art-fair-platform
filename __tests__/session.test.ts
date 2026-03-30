import { describe, it, expect, beforeEach } from "vitest";
import { signSession, verifySession } from "../lib/session";

describe("Session signing & verification", () => {
  beforeEach(() => {
    // 테스트에서는 기본 dev secret 사용
    delete process.env.SESSION_SECRET;
  });

  it("서명된 토큰을 정상적으로 검증한다", () => {
    const payload = { userId: "user_123", role: "artist" };
    const token = signSession(payload);
    const result = verifySession<typeof payload>(token);
    expect(result).toEqual(payload);
  });

  it("위조된 토큰은 null을 반환한다", () => {
    const payload = { userId: "user_123", role: "artist" };
    const token = signSession(payload);
    const tampered = token.slice(0, -5) + "xxxxx"; // 서명 위조
    const result = verifySession(tampered);
    expect(result).toBeNull();
  });

  it("payload가 수정된 토큰은 null을 반환한다", () => {
    const payload = { userId: "user_123", role: "artist" };
    const token = signSession(payload);

    // base64 payload 부분만 바꿔서 위조
    const [, sig] = token.split(".");
    const fakePayload = Buffer.from(JSON.stringify({ userId: "hacker", role: "admin" })).toString("base64url");
    const forged = `${fakePayload}.${sig}`;

    const result = verifySession(forged);
    expect(result).toBeNull();
  });

  it("빈 문자열 토큰은 null을 반환한다", () => {
    expect(verifySession("")).toBeNull();
  });

  it("점이 없는 토큰은 null을 반환한다", () => {
    expect(verifySession("notavalidtoken")).toBeNull();
  });

  it("서로 다른 payload는 서로 다른 토큰을 생성한다", () => {
    const t1 = signSession({ userId: "a", role: "artist" });
    const t2 = signSession({ userId: "b", role: "gallery" });
    expect(t1).not.toEqual(t2);
  });

  it("curator 역할도 정상적으로 서명/검증된다", () => {
    const payload = { userId: "curator_abc", role: "curator", email: "curator@test.com" };
    const token = signSession(payload);
    const result = verifySession<typeof payload>(token);
    expect(result?.role).toBe("curator");
    expect(result?.email).toBe("curator@test.com");
  });
});
