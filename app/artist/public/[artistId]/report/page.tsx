"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { F, S } from "@/lib/design";

const EVENT_LABEL_KO: Record<string, string> = {
  exhibition: "전시", collaboration: "협업", publication: "출판",
  series_start: "작품 시리즈", residency: "레지던시", award: "수상",
  grant: "지원금/기금", opencall_result: "오픈콜 선정", press: "보도",
};

type ReportData = {
  name: string;
  artistId: string;
  country?: string | null;
  city?: string | null;
  genre?: string | null;
  startedYear?: number | null;
  instagram?: string | null;
  website?: string | null;
  exhibitions: { galleryName: string; theme: string; country: string; city: string; acceptedAt: string }[];
  selfExhibitions: {
    id: string; title: string; startDate?: string | null; endDate?: string | null;
    city?: string | null; country?: string | null;
    space?: { name: string } | null;
  }[];
  series: { id: string; title: string; description?: string | null; startYear?: number | null; endYear?: number | null }[];
  artEvents: { id: string; eventType: string; title: string; year: number; description?: string | null }[];
};

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

const th: React.CSSProperties = { fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8580", textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #1A1A1A", whiteSpace: "nowrap" };
const td: React.CSSProperties = { fontFamily: F, fontSize: 12, color: "#2A2A2A", padding: "9px 10px", borderBottom: "1px solid #E8E3DB", verticalAlign: "top", lineHeight: 1.5 };

export default function ActivityReportPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/artist/public/${artistId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d || d.error) setError(true); else setData(d); })
      .catch(() => setError(true));
  }, [artistId]);

  if (error) {
    return (
      <main style={{ maxWidth: 680, margin: "80px auto", padding: "0 32px", textAlign: "center" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
          리포트를 불러올 수 없습니다. 프로필이 비공개이거나 존재하지 않는 작가입니다.
        </p>
        <Link href="/" style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.1em", textTransform: "uppercase" }}>← ROB Home</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 680, margin: "80px auto", padding: "0 32px" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>리포트 생성 중…</p>
      </main>
    );
  }

  const events = [...data.artEvents].sort((a, b) => b.year - a.year);
  const generatedAt = new Date();
  const generatedLabel = `${generatedAt.getFullYear()}.${String(generatedAt.getMonth() + 1).padStart(2, "0")}.${String(generatedAt.getDate()).padStart(2, "0")}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 24px !important; max-width: 100% !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 40px", background: "#FDFBF7", minHeight: "100vh" }}>
        {/* Toolbar */}
        <div className="no-print" style={{ marginBottom: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "10px 20px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FFFFFF", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            인쇄 / PDF 저장
          </button>
          <Link
            href="/guide/activity-certification"
            style={{ padding: "10px 20px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#4A4A4A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}
          >
            예술활동증명 신청 가이드
          </Link>
        </div>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #1A1A1A", paddingBottom: 20, marginBottom: 8 }}>
          <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8B7355", margin: "0 0 8px" }}>
            Activity Record Report · 활동 기록 리포트
          </p>
          <h1 style={{ fontFamily: S, fontSize: 40, fontWeight: 300, color: "#1A1A1A", margin: 0 }}>{data.name}</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
            {data.genre && <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{data.genre}</span>}
            {(data.city || data.country) && (
              <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>
                {[data.city, data.country].filter(Boolean).join(", ")}
              </span>
            )}
            {data.startedYear && <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>활동 시작 {data.startedYear}년</span>}
            {data.website && <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{data.website}</span>}
          </div>
        </div>
        <p style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", margin: "0 0 36px" }}>
          작성일 {generatedLabel} · 출처 rob-roleofbridge.com/artist/public/{data.artistId}
        </p>

        {/* Open-call exhibitions (platform-recorded) */}
        {data.exhibitions.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "0 0 12px" }}>
              전시 참여 기록 <span style={{ fontFamily: F, fontSize: 10, color: "#8A8580" }}>(ROB 오픈콜 선정 내역)</span>
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>일자</th>
                  <th style={th}>전시 / 주제</th>
                  <th style={th}>주최(갤러리)</th>
                  <th style={th}>지역</th>
                </tr>
              </thead>
              <tbody>
                {data.exhibitions.map((e, i) => (
                  <tr key={i}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(e.acceptedAt)}</td>
                    <td style={td}>{e.theme}</td>
                    <td style={td}>{e.galleryName}</td>
                    <td style={td}>{[e.city, e.country].filter(Boolean).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Self-registered exhibitions */}
        {data.selfExhibitions.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "0 0 12px" }}>
              전시 이력 <span style={{ fontFamily: F, fontSize: 10, color: "#8A8580" }}>(작가 등록 공개 전시)</span>
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>기간</th>
                  <th style={th}>전시명</th>
                  <th style={th}>공간</th>
                  <th style={th}>지역</th>
                </tr>
              </thead>
              <tbody>
                {data.selfExhibitions.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {fmtDate(e.startDate)}{e.endDate ? ` – ${fmtDate(e.endDate)}` : ""}
                    </td>
                    <td style={td}>{e.title}</td>
                    <td style={td}>{e.space?.name || "—"}</td>
                    <td style={td}>{[e.city, e.country].filter(Boolean).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Activity timeline */}
        {events.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "0 0 12px" }}>활동 타임라인</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>연도</th>
                  <th style={th}>구분</th>
                  <th style={th}>내용</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{ev.year}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{EVENT_LABEL_KO[ev.eventType] || ev.eventType}</td>
                    <td style={td}>
                      {ev.title}
                      {ev.description ? <span style={{ color: "#8A8580" }}> — {ev.description}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Work series */}
        {data.series.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: "0 0 12px" }}>작품 시리즈</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>기간</th>
                  <th style={th}>시리즈</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((s) => (
                  <tr key={s.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {s.startYear ?? ""}{s.endYear ? `–${s.endYear}` : s.startYear ? "–" : ""}
                    </td>
                    <td style={td}>
                      {s.title}
                      {s.description ? <span style={{ color: "#8A8580" }}> — {s.description}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {data.exhibitions.length === 0 && data.selfExhibitions.length === 0 && events.length === 0 && data.series.length === 0 && (
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.7 }}>
            아직 공개된 활동 기록이 없습니다. 전시·수상·레지던시 등 활동을 등록하고 공개로 설정하면 이 리포트에 자동으로 정리됩니다.
          </p>
        )}

        {/* Legal disclaimer — must stay on the printed document */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #1A1A1A" }}>
          <p style={{ fontFamily: F, fontSize: 10, color: "#8A8580", lineHeight: 1.8, margin: 0 }}>
            본 문서는 ROB(Role of Bridge) 플랫폼에 기록된 활동 내역을 정리한 자료이며,
            한국예술인복지재단이 발급하는 「예술활동증명」 확인서가 아닙니다.
            예술활동증명 신청 시 증빙을 보완하는 보조 자료로 활용하실 수 있으며,
            신청 및 심사는 한국예술인복지재단(kawf.kr)을 통해 진행됩니다.
          </p>
          <p style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", lineHeight: 1.8, margin: "8px 0 0" }}>
            This document is a summary of activity records on the ROB platform and is not an
            official certificate issued by the Korean Artist Welfare Foundation.
          </p>
        </div>
      </main>
    </>
  );
}
