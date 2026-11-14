import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ELIGIBILITY_UNKNOWN,
  FEE_UNKNOWN,
  eligibilityDisplay,
  feeDisplay,
  listingFacts,
  locationLine,
  typeDisplay,
} from "@/lib/openCall/listingFacts";
import { PREPARATION_DISCLAIMER_KO, parsePreparationStatus } from "@/lib/openCall/preparationStatus";

const state = vi.hoisted(() => ({
  session: null as { userId: string; role: string } | null,
  rows: [] as Array<{ userId: string; openCallId: string; status: string; note: string | null }>,
}));

vi.mock("@/lib/auth", () => ({
  getServerSession: () => state.session,
}));

vi.mock("@/app/data/openCalls", () => ({
  getOpenCallById: async (id: string) => (id === "missing" ? null : { id, isExternal: id.startsWith("ext") }),
}));

vi.mock("@/lib/openCall/preparationStore", () => ({
  readPreparation: async (userId: string, openCallId: string) => {
    const row = state.rows.find((item) => item.userId === userId && item.openCallId === openCallId);
    return row ? { openCallId, status: row.status, note: row.note, updatedAt: "2026-11-14T00:00:00.000Z" } : null;
  },
  savePreparation: async (input: { userId: string; openCallId: string; status: string; note?: string | null }) => {
    const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;
    const existing = state.rows.find((item) => item.userId === input.userId && item.openCallId === input.openCallId);
    if (existing) {
      existing.status = input.status;
      existing.note = note;
    } else {
      state.rows.push({ userId: input.userId, openCallId: input.openCallId, status: input.status, note });
    }
    return { openCallId: input.openCallId, status: input.status, note, updatedAt: "2026-11-14T00:00:00.000Z" };
  },
  clearPreparation: async (userId: string, openCallId: string) => {
    state.rows = state.rows.filter((item) => !(item.userId === userId && item.openCallId === openCallId));
  },
}));

import { DELETE, GET, PUT } from "@/app/api/open-calls/[id]/preparation/route";

const spacenamu = {
  city: "Seoul",
  theme: "스페이스나무 미술관 등록 기념 초대작가 공모",
  galleryDescription:
    "주소 ▶ 경상남도 양산시 하북면 충렬로 1733 이메일 ▶ spacenamu_@naver.com 홈페이지 ▶ http://www.spacenamu.net 미술작품 공모전을 개최합니다.",
  externalUrl: "https://blog.naver.com/venice87/224467094699",
  galleryWebsite: "https://rss.blog.naver.com/venice87.xml",
  externalEmail: "editor@k-artblog.kr",
};

function call(method: "GET" | "PUT" | "DELETE", id: string, body?: unknown) {
  const request = new Request(`https://rob.example/api/open-calls/${id}/preparation`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const params = { params: { id } };
  if (method === "GET") return GET(request, params);
  if (method === "DELETE") return DELETE(request, params);
  return PUT(request, params);
}

describe("open call source facts", () => {
  it("treats a reprinted notice as a source and keeps the blog editor from receiving an application", () => {
    const facts = listingFacts(spacenamu);
    expect(facts.sourceRole).toBe("reprint");
    expect(facts.organizerUrl).toBe("http://www.spacenamu.net");
    expect(facts.organizerEmail).not.toBe("editor@k-artblog.kr");
    expect(facts.canEmailOrganizer).toBe(false);
    expect(locationLine(facts, "Seoul").usesStoredCity).toBe(false);
    expect(locationLine(facts, "Seoul").text).toContain("양산시");
  });

  it("shows unknown fee, eligibility, and type instead of inventing them", () => {
    const facts = listingFacts({
      city: "Seoul",
      theme: "2027 엠아트센터 창작활동 지원작가 모집 공고",
      galleryDescription: "주관 ▶ 엠아트센터",
      externalUrl: "https://blog.naver.com/venice87/1",
      externalEmail: "editor@k-artblog.kr",
    });
    expect(feeDisplay(facts.fee)).toBe(FEE_UNKNOWN);
    expect(feeDisplay(facts.fee)).not.toBe("무료");
    expect(eligibilityDisplay(facts.eligibility)).toBe(ELIGIBILITY_UNKNOWN);
    expect(typeDisplay(facts.kind)).toBe("유형 확인 필요");
    expect(facts.canEmailOrganizer).toBe(false);
  });

  it("keeps an explicitly free fee and a residency type", () => {
    const facts = listingFacts({
      city: "Tokyo",
      theme: "Sado Island International Artist Residency",
      galleryDescription: "참가비 ▶ 무료 eligibility ▶ artists working in any medium",
      externalUrl: "https://air-j.info/en/program/sado/",
      externalEmail: "contact@sia-promotion.org",
    });
    expect(feeDisplay(facts.fee)).toBe("무료");
    expect(facts.kind).toBe("레지던시");
    expect(facts.canEmailOrganizer).toBe(false);
    expect(facts.officialApplicationUrl).toBeNull();
  });
});

describe("private preparation state", () => {
  beforeEach(() => {
    state.session = null;
    state.rows = [];
  });

  it("blocks an anonymous reader and writer", async () => {
    expect((await call("GET", "ext-1")).status).toBe(401);
    expect((await call("PUT", "ext-1", { status: "PLANNING" })).status).toBe(401);
    expect(state.rows).toHaveLength(0);
  });

  it("keeps user A invisible to user B on the same open call", async () => {
    state.session = { userId: "user-a", role: "artist" };
    expect((await call("PUT", "ext-1", { status: "PREPARING", userId: "user-b", note: "A private" })).status).toBe(200);
    state.session = { userId: "user-b", role: "artist" };
    const seen = await (await call("GET", "ext-1")).json();
    expect(seen.preparation).toBeNull();
    expect(JSON.stringify(seen)).not.toContain("A private");
    expect((await call("PUT", "ext-1", { status: "PLANNING" })).status).toBe(200);
    expect((await call("DELETE", "ext-1")).status).toBe(200);
    state.session = { userId: "user-a", role: "artist" };
    const own = await (await call("GET", "ext-1")).json();
    expect(own.preparation.status).toBe("PREPARING");
    expect(own.preparation.note).toBe("A private");
    expect(own.preparation.userId).toBeUndefined();
    expect(state.rows.find((row) => row.userId === "user-b")).toBeUndefined();
  });

  it("updates and clears only the signed-in artist's row", async () => {
    state.session = { userId: "user-a", role: "artist" };
    await call("PUT", "ext-1", { status: "PLANNING" });
    expect((await call("PUT", "ext-1", { status: "APPLIED" })).status).toBe(200);
    expect((await call("PUT", "ext-1", { status: "accepted" })).status).toBe(400);
    expect((await call("DELETE", "ext-1")).status).toBe(200);
    expect((await (await call("GET", "ext-1")).json()).preparation).toBeNull();
    expect(parsePreparationStatus("RESULT_RECORDED")).toBe("RESULT_RECORDED");
  });
});

describe("release boundaries", () => {
  it("ships an additive locked migration and does not create the table at runtime", () => {
    const sql = readFileSync(path.join(process.cwd(), "prisma/sql/add-open-call-preparation.sql"), "utf8");
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain("REVOKE ALL ON TABLE \"OpenCallPreparation\" FROM anon, authenticated, PUBLIC");
    expect(sql).toContain("OpenCallPreparation_userId_openCallId_key");
    const store = readFileSync(path.join(process.cwd(), "lib/openCall/preparationStore.ts"), "utf8");
    expect(store).not.toContain("CREATE TABLE");
    expect(store).not.toContain("ensureTable");
    const route = readFileSync(path.join(process.cwd(), "app/api/open-calls/[id]/preparation/route.ts"), "utf8");
    expect(route).toContain("session.userId");
    expect(route).not.toContain("body?.userId");
    expect(route).not.toContain("body.userId");
  });

  it("leaves internal application delivery in place and blocks a blog editor recipient", () => {
    const applications = readFileSync(path.join(process.cwd(), "app/api/applications/route.ts"), "utf8");
    const internalAt = applications.indexOf("if (!openCall.isExternal)");
    const externalAt = applications.indexOf("facts.canEmailOrganizer");
    expect(internalAt).toBeGreaterThan(-1);
    expect(externalAt).toBeGreaterThan(internalAt);
    expect(applications.slice(internalAt, externalAt)).toContain("new_application");
    expect(applications).toContain('if (!facts.canEmailOrganizer) outreachReason = "reprint_not_organizer"');
    const page = readFileSync(path.join(process.cwd(), "app/open-calls/[id]/page.tsx"), "utf8");
    expect(page).toContain("PREPARATION_DISCLAIMER_KO");
    expect(PREPARATION_DISCLAIMER_KO).toBe("이 상태는 ROB에서 관리하는 개인 준비 기록이며, 실제 지원 접수 상태와는 다릅니다.");
    expect(page).toContain("공식 지원 페이지 확인");
    expect(page).toContain("원문에서 지원 방법 확인");
    expect(page).toContain("aria-pressed");
  });

  it("does not expose preparation rows in admin pages", () => {
    const roots = ["app/admin", "app/api/admin"].map((dir) => path.join(process.cwd(), dir));
    const files = roots.flatMap((dir) => filesUnder(dir));
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("OpenCallPreparation");
      expect(source).not.toContain("openCallPreparation");
    }
  });
});

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return filesUnder(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}
