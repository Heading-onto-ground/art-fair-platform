"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import type { CSSProperties } from "react";

type PublicItem = {
  id: string;
  anonymousAlias: string;
  title: string;
  content: string;
  workLinks: string | null;
  rejectionContext: string | null;
  emotion: string | null;
  createdAt: number;
  publishedAt: number | null;
};

export default function RejectedArtistsPage() {
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rejected-artists?limit=80", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d?.testimonies) ? d.testimonies : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px 72px" }}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Rejected Artists Archive
          </span>
          <h1 style={{ fontFamily: S, fontSize: "clamp(32px, 6vw, 46px)", fontWeight: 300, marginTop: 8, marginBottom: 8 }}>
            증명되지 못한 예술가들
          </h1>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.75, maxWidth: 760, margin: 0 }}>
            이 페이지는 실명 대신 익명 별칭으로 사례를 공개합니다. 핵심은 개인 비난이 아니라, 실제 창작을 놓치는 문서 중심 시스템을 드러내는 것입니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
          <Link href="/rejected-artists/submit" style={ctaPrimary}>
            익명 제보 작성하기
          </Link>
          <a href="https://www.threads.net/@noas_no_art_special" target="_blank" rel="noreferrer" style={ctaGhost}>
            Threads에서 확산하기
          </a>
        </div>

        {loading ? (
          <p style={emptyText}>불러오는 중...</p>
        ) : items.length === 0 ? (
          <p style={emptyText}>아직 공개된 사례가 없습니다. 첫 사례를 남겨주세요.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <article key={item.id} style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 6 }}>
                  <h2 style={{ margin: 0, fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A" }}>{item.title}</h2>
                  <span style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2" }}>
                    {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 10 }}>
                  {item.anonymousAlias}
                </div>
                <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: "0 0 12px" }}>
                  {item.content}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {item.rejectionContext ? <span style={tag}>거절 맥락: {item.rejectionContext}</span> : null}
                  {item.emotion ? <span style={tag}>감정: {item.emotion}</span> : null}
                  {item.workLinks ? <span style={tag}>작업 링크: {item.workLinks}</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

const emptyText: CSSProperties = { fontFamily: F, fontSize: 13, color: "#B0AAA2" };
const ctaPrimary: CSSProperties = {
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
const ctaGhost: CSSProperties = {
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
const tag: CSSProperties = {
  padding: "4px 8px",
  border: "1px solid #F0EBE3",
  background: "#FAF8F4",
  fontFamily: F,
  fontSize: 11,
  color: "#8A8580",
};
