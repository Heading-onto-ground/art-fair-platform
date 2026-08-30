"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import LaborSurveyPreview from "@/app/components/LaborSurveyPreview";
import { F, S } from "@/lib/design";
import { LABOR_SURVEY_EXPORT_COLUMNS } from "@/lib/laborSurveyExport";
import { downloadLaborSurveyPdf, laborSurveyPdfFilename } from "@/lib/downloadLaborSurveyPdf";
import type { LaborSurveyCampaignPublic } from "@/lib/laborSurveyTypes";
import type { AdminLaborSurveyResponse } from "@/lib/laborSurvey";

type AdminTab = "responses" | "preview" | "live";

export default function AdminLaborSurveyPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tab, setTab] = useState<AdminTab>("responses");
  const [campaigns, setCampaigns] = useState<LaborSurveyCampaignPublic[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [responses, setResponses] = useState<AdminLaborSurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (data?.authenticated) setAuthenticated(true);
        else {
          setAuthenticated(false);
          router.replace("/admin/login");
        }
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  async function load(campaignId?: string) {
    setLoading(true);
    setMsg(null);
    try {
      const q = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}&responses=1` : "?responses=1";
      const res = await fetch(`/api/admin/labor-survey${q}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "load_failed");
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
      setActiveId(data.activeCampaignId || campaignId || "");
      setResponses(Array.isArray(data.responses) ? data.responses : []);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authenticated) return;
    load();
  }, [authenticated]);

  async function toggleActive(id: string, isActive: boolean) {
    setMsg(null);
    try {
      const res = await fetch("/api/admin/labor-survey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, isActive }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "update_failed");
      setMsg(isActive ? "캠페인을 활성화했습니다." : "캠페인을 비활성화했습니다.");
      await load(id);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "저장 실패");
    }
  }

  async function savePdf() {
    if (!activeId || pdfDownloading || responses.length === 0) return;
    setPdfDownloading(true);
    setMsg(null);
    try {
      const title =
        campaigns.find((c) => c.id === activeId)?.title || campaigns[0]?.title || "예술인 노동 설문";
      const filename = laborSurveyPdfFilename(title);
      await downloadLaborSurveyPdf({ campaignId: activeId, filename });
      setMsg(`${filename} 파일을 저장했습니다.`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "PDF를 만들지 못했습니다.");
    } finally {
      setPdfDownloading(false);
    }
  }

  if (authenticated === null) {
    return (
      <>
        <AdminTopBar />
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>확인 중...</p>
        </main>
      </>
    );
  }

  const activeCampaign = campaigns.find((c) => c.id === activeId) ?? campaigns[0];

  const tableColumns = LABOR_SURVEY_EXPORT_COLUMNS.filter((c) =>
    ["submittedAt", "artistDisplayName", "instagramId", "ageGroup", "gender", "field", "careerYears", "laborExperience"].includes(c.key),
  );

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 72px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
          Labor survey
        </span>
        <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, margin: "8px 0 8px" }}>예술인 노동 설문</h1>
        <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.7, marginBottom: 20 }}>
          관리자에서 설문 미리보기·응답 목록·PDF 저장을 할 수 있습니다. 응답자는 작가명·인스타 아이디로만 표시됩니다.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {([
            { id: "responses" as const, label: "응답 목록" },
            { id: "preview" as const, label: "설문 미리보기" },
            { id: "live" as const, label: "공개 페이지" },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 16px",
                border: `1px solid ${tab === t.id ? "#1A1A1A" : "#E8E3DB"}`,
                background: tab === t.id ? "#1A1A1A" : "#FFF",
                color: tab === t.id ? "#FFF" : "#6E655B",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && <p style={{ fontFamily: F, fontSize: 12, color: "#6A6A6A", marginBottom: 16 }}>{msg}</p>}

        {tab === "preview" && (
          <section style={{ border: "1px solid #E8E3DB", background: "#FFF", padding: "20px 24px", maxWidth: 560 }}>
            <LaborSurveyPreview />
            <a href="/" target="_blank" rel="noreferrer" style={{ ...ghostBtn, marginTop: 12 }}>
              실제 공개 설문 페이지 열기 ↗
            </a>
          </section>
        )}

        {tab === "live" && (
          <section style={{ border: "1px solid #E8E3DB", background: "#FFF", padding: "24px" }}>
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", lineHeight: 1.7, marginBottom: 16 }}>
              참여자에게 보이는 메인 페이지입니다. 제출된 응답은 관리자만 확인할 수 있습니다.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/" target="_blank" rel="noreferrer" style={primaryBtn}>
                설문 페이지 (/) ↗
              </a>
            </div>
          </section>
        )}

        {tab === "responses" && (
          <>
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: S, fontSize: 22, fontWeight: 300, marginBottom: 12 }}>캠페인</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {campaigns.map((c) => (
                  <article key={c.id} style={{ border: "1px solid #E8E3DB", background: "#FFF", padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ margin: 0, fontFamily: F, fontSize: 15, fontWeight: 600 }}>{c.title}</h3>
                        {c.subtitle && <p style={{ margin: "4px 0 0", fontFamily: F, fontSize: 12, color: "#8A8580" }}>{c.subtitle}</p>}
                      </div>
                      <span style={{ fontFamily: F, fontSize: 11, color: c.isActive ? "#5A7A5A" : "#8A8580" }}>
                        {c.isActive ? "활성" : "비활성"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => load(c.id)} style={ghostBtn}>
                        응답 불러오기
                      </button>
                      <button type="button" onClick={() => toggleActive(c.id, !c.isActive)} style={ghostBtn}>
                        {c.isActive ? "비활성화" : "활성화"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontFamily: S, fontSize: 22, fontWeight: 300, margin: 0 }}>
                    응답 목록 ({responses.length}건)
                  </h2>
                  {activeCampaign && (
                    <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", margin: "6px 0 0" }}>
                      {activeCampaign.title}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={savePdf}
                  disabled={responses.length === 0 || pdfDownloading}
                  style={{
                    ...primaryBtn,
                    opacity: responses.length === 0 || pdfDownloading ? 0.5 : 1,
                    cursor: responses.length === 0 || pdfDownloading ? "not-allowed" : "pointer",
                  }}
                >
                  {pdfDownloading ? "PDF 생성 중..." : "PDF로 저장"}
                </button>
              </div>

              {loading ? (
                <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>불러오는 중...</p>
              ) : responses.length === 0 ? (
                <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>아직 응답이 없습니다.</p>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #E8E3DB", background: "#FFF" }}>
                  <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontFamily: F, fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F5F1EB", textAlign: "left" }}>
                        <th style={thStyle}>#</th>
                        {tableColumns.map((col) => (
                          <th key={col.key} style={thStyle}>{col.header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((r, idx) => (
                        <tr key={r.id} style={{ borderTop: "1px solid #E8E3DB" }}>
                          <td style={tdStyle}>{idx + 1}</td>
                          {tableColumns.map((col) => (
                            <td key={col.key} style={tdStyle}>
                              {col.key === "laborExperience"
                                ? truncate(col.get(r), 80)
                                : col.get(r) || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", padding: "10px 14px", margin: 0 }}>
                    PDF 저장 시 기존 응답과 전체 항목(동의 포함 {LABOR_SURVEY_EXPORT_COLUMNS.length}개)이 포함됩니다.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

const thStyle: CSSProperties = {
  padding: "10px 12px",
  fontWeight: 600,
  fontSize: 11,
  color: "#6E655B",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  color: "#4A4A4A",
  verticalAlign: "top",
  maxWidth: 280,
  lineHeight: 1.5,
};

const ghostBtn: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#6E655B",
  fontFamily: F,
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textDecoration: "none",
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  display: "inline-block",
  padding: "10px 16px",
  border: "1px solid #1A1A1A",
  background: "#1A1A1A",
  color: "#FFFFFF",
  fontFamily: F,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textDecoration: "none",
  cursor: "pointer",
};
