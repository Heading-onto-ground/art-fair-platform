"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import type { CSSProperties } from "react";

type Session = { userId: string; role: "artist" | "gallery" | "curator"; email?: string };
type MyItem = {
  id: string;
  anonymousAlias: string;
  title: string;
  status: "pending" | "published" | "rejected";
  adminNote: string | null;
  createdAt: number;
  publishedAt: number | null;
};

export default function RejectedArtistsSubmitPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [mine, setMine] = useState<MyItem[]>([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    workLinks: "",
    rejectionContext: "",
    emotion: "",
  });

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSession(d?.session ?? null))
      .catch(() => setSession(null))
      .finally(() => setLoadingSession(false));
  }, []);

  useEffect(() => {
    if (!session || session.role !== "artist") return;
    fetch("/api/rejected-artists?mine=1&limit=30", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMine(Array.isArray(d?.testimonies) ? d.testimonies : []))
      .catch(() => setMine([]));
  }, [session?.userId, session?.role]);

  async function submit() {
    if (!form.title.trim() || !form.content.trim()) {
      setResult("제목과 본문은 필수입니다.");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/rejected-artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "submit_failed");
      setResult("제보가 등록되었습니다. 운영 검수 후 공개됩니다.");
      setForm({ title: "", content: "", workLinks: "", rejectionContext: "", emotion: "" });
      const mineRes = await fetch("/api/rejected-artists?mine=1&limit=30", { cache: "no-store", credentials: "include" });
      const mineData = await mineRes.json().catch(() => null);
      setMine(Array.isArray(mineData?.testimonies) ? mineData.testimonies : []);
    } catch (e: any) {
      setResult(e?.message || "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>불러오는 중...</p>
        </main>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, marginBottom: 12 }}>로그인이 필요합니다</h1>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.7, marginBottom: 18 }}>
            익명 제보는 로그인한 작가 계정으로만 작성할 수 있습니다.
          </p>
          <Link href="/login?role=artist&redirect=/rejected-artists/submit" style={primaryBtn}>
            작가 로그인
          </Link>
        </main>
      </>
    );
  }

  if (session.role !== "artist") {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, marginBottom: 12 }}>작가 계정 전용</h1>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580" }}>
            현재 계정은 작가 계정이 아닙니다.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 72px" }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Artist-only anonymous submission
          </span>
          <h1 style={{ fontFamily: S, fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 300, marginTop: 8, marginBottom: 8 }}>
            거절 사례 익명 제보
          </h1>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.75, maxWidth: 760 }}>
            작성자는 로그인으로 검증하지만, 공개 시에는 익명 별칭으로만 노출됩니다. 개인/기관 비난보다 구조 비판 중심으로 작성해 주세요.
          </p>
        </div>

        <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "20px", marginBottom: 22 }}>
          <label style={label}>제목 *</label>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} style={input} placeholder="예: 5년 활동했는데도 증명 불가 판정" />

          <label style={label}>사례 본문 *</label>
          <textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} style={{ ...input, minHeight: 180, resize: "vertical" }} placeholder="무엇이 있었는지, 무엇이 문제인지, 어떤 감정이었는지 적어주세요." />

          <label style={label}>작업/활동 링크 (선택)</label>
          <input value={form.workLinks} onChange={(e) => setForm((p) => ({ ...p, workLinks: e.target.value }))} style={input} placeholder="포트폴리오, 전시, 아카이브 링크 등" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={label}>거절 맥락 (선택)</label>
              <input value={form.rejectionContext} onChange={(e) => setForm((p) => ({ ...p, rejectionContext: e.target.value }))} style={input} placeholder="예: 서류 미충족" />
            </div>
            <div>
              <label style={label}>감정 키워드 (선택)</label>
              <input value={form.emotion} onChange={(e) => setForm((p) => ({ ...p, emotion: e.target.value }))} style={input} placeholder="예: 모멸감, 무력감" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
            <button onClick={submit} disabled={submitting} style={{ ...primaryBtn, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.75 : 1 }}>
              {submitting ? "제출 중..." : "익명 제보 제출"}
            </button>
            <Link href="/rejected-artists" style={ghostBtn}>공개 아카이브 보기</Link>
          </div>
          {result ? <p style={{ marginTop: 10, fontFamily: F, fontSize: 12, color: "#6A6A6A" }}>{result}</p> : null}
        </div>

        <section>
          <h2 style={{ fontFamily: S, fontSize: 26, fontWeight: 300, marginBottom: 10 }}>내 제출 내역</h2>
          {mine.length === 0 ? (
            <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>아직 제출한 사례가 없습니다.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {mine.map((item) => (
                <article key={item.id} style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                    <h3 style={{ margin: 0, fontFamily: F, fontSize: 14, fontWeight: 600 }}>{item.title}</h3>
                    <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>
                      {item.status === "pending" ? "검수 대기" : item.status === "published" ? "공개됨" : "보류"}
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontFamily: F, fontSize: 11, color: "#B0AAA2" }}>
                    {item.anonymousAlias} · {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  {item.adminNote ? (
                    <p style={{ margin: "8px 0 0", fontFamily: F, fontSize: 12, color: "#6A6A6A" }}>
                      운영 메모: {item.adminNote}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const label: CSSProperties = {
  display: "block",
  marginTop: 12,
  marginBottom: 6,
  fontFamily: F,
  fontSize: 11,
  color: "#8A8580",
};
const input: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#1A1A1A",
  fontFamily: F,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
};
const primaryBtn: CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  border: "1px solid #1A1A1A",
  background: "#1A1A1A",
  color: "#FFFFFF",
  fontFamily: F,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textDecoration: "none",
};
const ghostBtn: CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#6E655B",
  fontFamily: F,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textDecoration: "none",
};
