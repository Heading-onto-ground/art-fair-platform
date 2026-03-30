"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { F, S, colors } from "@/lib/design";

type AnalyticsData = {
  summary: {
    totalOpenCalls: number;
    totalApplications: number;
    acceptedCount: number;
    reviewingCount: number;
    rejectedCount: number;
    pendingCount: number;
  };
  byStatus: { status: string; label: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byOpenCall: { id: string; theme: string; city: string; country: string; deadline: string; total: number; accepted: number; reviewing: number; submitted: number; rejected: number }[];
  timeline: { month: string; count: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "#8B7355",
  reviewing: "#9A8A5A",
  accepted: "#5A7A5A",
  rejected: "#8B4A4A",
};

const STATUS_LABELS: Record<string, { ko: string; en: string }> = {
  submitted: { ko: "지원 완료", en: "Submitted" },
  reviewing: { ko: "검토 중", en: "Reviewing" },
  accepted: { ko: "수락됨", en: "Accepted" },
  rejected: { ko: "거절됨", en: "Rejected" },
};

function BarChart({ data, maxVal, lang }: { data: { label: string; count: number }[]; maxVal: number; lang: string }) {
  if (maxVal === 0) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: colors.textLight, fontFamily: F, fontSize: 12 }}>
      {lang === "ko" ? "데이터 없음" : "No data"}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map(({ label, count }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 90, fontFamily: F, fontSize: 11, color: colors.textMuted, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </div>
          <div style={{ flex: 1, height: 20, background: colors.bgSecondary, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${(count / maxVal) * 100}%`,
                background: colors.accent,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div style={{ width: 28, fontFamily: F, fontSize: 11, color: colors.textSecondary, flexShrink: 0 }}>{count}</div>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ timeline, lang }: { timeline: { month: string; count: number }[]; lang: string }) {
  const maxCount = Math.max(...timeline.map((t) => t.count), 1);
  const w = 600;
  const h = 80;
  const pad = 8;
  const step = (w - pad * 2) / (timeline.length - 1);

  const points = timeline.map((t, i) => ({
    x: pad + i * step,
    y: h - pad - ((t.count / maxCount) * (h - pad * 2)),
    ...t,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 24}`} style={{ fontFamily: F }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke={colors.accent} strokeWidth="1.5" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={colors.accent} />
            {p.count > 0 && (
              <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={9} fill={colors.textMuted}>{p.count}</text>
            )}
            <text x={p.x} y={h + 16} textAnchor="middle" fontSize={8} fill={colors.textLight}>
              {p.month.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function GalleryAnalyticsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gallery/analytics", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load analytics"); setLoading(false); });
  }, [router]);

  const lbl = (ko: string, en: string) => (lang === "ko" ? ko : en);

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "56px 40px" }}>
          <div style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>{lbl("불러오는 중…", "Loading…")}</div>
        </main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "56px 40px" }}>
          <div style={{ fontFamily: F, fontSize: 13, color: colors.error }}>{error ?? "Error"}</div>
        </main>
      </>
    );
  }

  const { summary, byStatus, byCountry, byOpenCall, timeline } = data;
  const maxCountry = byCountry[0]?.count ?? 1;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "56px 40px" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", color: colors.accent, textTransform: "uppercase" }}>
            {lbl("갤러리", "Gallery")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: colors.textPrimary, marginTop: 8, marginBottom: 0 }}>
            {lbl("Analytics", "Analytics")}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textLight, marginTop: 4 }}>
            {lbl("오픈콜 성과 및 지원자 통계", "Open call performance & applicant statistics")}
          </p>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1, background: colors.border, marginBottom: 48 }}>
          {[
            { label: lbl("오픈콜", "Open Calls"), value: summary.totalOpenCalls },
            { label: lbl("총 지원", "Total Apps"), value: summary.totalApplications },
            { label: lbl("수락", "Accepted"), value: summary.acceptedCount, color: colors.success },
            { label: lbl("검토 중", "Reviewing"), value: summary.reviewingCount, color: colors.warning },
            { label: lbl("수락률", "Accept Rate"), value: summary.totalApplications > 0 ? `${Math.round((summary.acceptedCount / summary.totalApplications) * 100)}%` : "—" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: colors.bgCard, padding: "20px 22px" }}>
              <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.textMuted, marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: S, fontSize: 32, color: color ?? colors.textPrimary, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 월별 지원 타임라인 */}
        <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, padding: "28px 32px", marginBottom: 24 }}>
          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: 8 }}>
            {lbl("월별 지원 현황", "Monthly Applications")}
          </div>
          <div style={{ fontFamily: S, fontSize: 20, color: colors.textPrimary, marginBottom: 20 }}>
            {lbl("최근 12개월", "Last 12 Months")}
          </div>
          <MiniLineChart timeline={timeline} lang={lang} />
        </section>

        {/* 지원 상태별 + 국가별 (2열) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* 상태별 */}
          <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, padding: "28px 32px" }}>
            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: 8 }}>
              {lbl("상태별", "By Status")}
            </div>
            <div style={{ fontFamily: S, fontSize: 20, color: colors.textPrimary, marginBottom: 20 }}>
              {lbl("지원 현황", "Applications")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {byStatus.map(({ status, count }) => {
                const pct = summary.totalApplications > 0 ? (count / summary.totalApplications) * 100 : 0;
                const statusLabel = STATUS_LABELS[status] ?? { ko: status, en: status };
                return (
                  <div key={status}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary }}>
                        {lang === "ko" ? statusLabel.ko : statusLabel.en}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 12, color: colors.textMuted }}>{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div style={{ height: 6, background: colors.bgSecondary }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: STATUS_COLORS[status] ?? colors.accent, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 국가별 */}
          <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, padding: "28px 32px" }}>
            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: 8 }}>
              {lbl("국가별", "By Country")}
            </div>
            <div style={{ fontFamily: S, fontSize: 20, color: colors.textPrimary, marginBottom: 20 }}>
              {lbl("지원자 출신", "Applicant Origins")}
            </div>
            <BarChart
              data={byCountry.map((c) => ({ label: c.country, count: c.count }))}
              maxVal={maxCountry}
              lang={lang}
            />
          </section>
        </div>

        {/* 오픈콜별 성과 테이블 */}
        <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, padding: "28px 32px", marginBottom: 24 }}>
          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: 8 }}>
            {lbl("오픈콜별", "By Open Call")}
          </div>
          <div style={{ fontFamily: S, fontSize: 20, color: colors.textPrimary, marginBottom: 20 }}>
            {lbl("성과 비교", "Performance Comparison")}
          </div>
          {byOpenCall.length === 0 ? (
            <div style={{ fontFamily: F, fontSize: 13, color: colors.textLight, textAlign: "center", padding: "24px 0" }}>
              {lbl("오픈콜이 없습니다", "No open calls yet")}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {[
                      lbl("주제", "Theme"),
                      lbl("도시", "City"),
                      lbl("마감", "Deadline"),
                      lbl("총 지원", "Total"),
                      lbl("수락", "Accepted"),
                      lbl("검토 중", "Reviewing"),
                      lbl("수락률", "Rate"),
                    ].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: colors.textMuted, fontWeight: 500, letterSpacing: "0.06em", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byOpenCall.map((oc) => (
                    <tr
                      key={oc.id}
                      style={{ borderBottom: `1px solid ${colors.borderLight}`, cursor: "pointer" }}
                      onClick={() => router.push("/gallery")}
                      onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgSecondary; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "12px", color: colors.textPrimary, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{oc.theme}</td>
                      <td style={{ padding: "12px", color: colors.textMuted }}>{oc.city}</td>
                      <td style={{ padding: "12px", color: colors.textMuted }}>{oc.deadline}</td>
                      <td style={{ padding: "12px", color: colors.textPrimary, fontWeight: 500 }}>{oc.total}</td>
                      <td style={{ padding: "12px", color: colors.success }}>{oc.accepted}</td>
                      <td style={{ padding: "12px", color: colors.warning }}>{oc.reviewing}</td>
                      <td style={{ padding: "12px", color: colors.textSecondary }}>
                        {oc.total > 0 ? `${Math.round((oc.accepted / oc.total) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 갤러리 대시보드로 돌아가기 */}
        <div style={{ textAlign: "right" }}>
          <button
            onClick={() => router.push("/gallery")}
            style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 24px", border: `1px solid ${colors.border}`, background: "transparent", color: colors.textSecondary, cursor: "pointer" }}
          >
            {lbl("← 갤러리 대시보드", "← Gallery Dashboard")}
          </button>
        </div>
      </main>
    </>
  );
}
