"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LABOR_SURVEY_EXPORT_COLUMNS } from "@/lib/laborSurveyExport";
import { downloadLaborSurveyPdf, laborSurveyPdfFilename } from "@/lib/downloadLaborSurveyPdf";
import type { AdminLaborSurveyResponse } from "@/lib/laborSurvey";
import type { LaborSurveyCampaignPublic } from "@/lib/laborSurveyTypes";

type SurveyData = {
  campaign: LaborSurveyCampaignPublic | null;
  responses: AdminLaborSurveyResponse[];
};

export default function LaborSurveyPdfPage() {
  const router = useRouter();
  const [data, setData] = useState<SurveyData | null>(null);
  const [error, setError] = useState("");
  const [pdfDownloading, setPdfDownloading] = useState(false);

  useEffect(() => {
    const campaignId = new URLSearchParams(window.location.search).get("campaignId") || "";
    const query = campaignId
      ? `?campaignId=${encodeURIComponent(campaignId)}&responses=1`
      : "?responses=1";

    fetch(`/api/admin/labor-survey${query}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (res.status === 401 || res.status === 403) {
          router.replace("/admin/login");
          return null;
        }
        if (!res.ok || !body?.ok) throw new Error(body?.error || "load_failed");
        const campaigns = Array.isArray(body.campaigns) ? body.campaigns : [];
        const targetId = campaignId || body.activeCampaignId;
        return {
          campaign: campaigns.find((campaign: LaborSurveyCampaignPublic) => campaign.id === targetId) ?? null,
          responses: Array.isArray(body.responses) ? body.responses : [],
        };
      })
      .then((result) => {
        if (result) setData(result);
      })
      .catch(() => setError("설문 응답을 불러오지 못했습니다."));
  }, [router]);

  async function savePdf() {
    if (!data || data.responses.length === 0 || pdfDownloading) return;
    const campaignId = new URLSearchParams(window.location.search).get("campaignId") || "";
    setPdfDownloading(true);
    setError("");
    try {
      await downloadLaborSurveyPdf({
        campaignId,
        filename: laborSurveyPdfFilename(data.campaign?.title || "예술인 노동 설문"),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF를 만들지 못했습니다.");
    } finally {
      setPdfDownloading(false);
    }
  }

  return (
    <main className="pdf-document">
      <style jsx global>{`
        body {
          margin: 0;
          background: #eeeae3;
          color: #1a1a1a;
          font-family: "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
        }
        .pdf-toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 12px 24px;
          background: #1a1a1a;
          color: #fff;
        }
        .pdf-toolbar button {
          border: 1px solid #fff;
          background: #fff;
          color: #1a1a1a;
          padding: 9px 16px;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
        }
        .response-sheet {
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          margin: 16px auto;
          padding: 18mm 16mm;
          background: #fff;
          break-after: page;
        }
        .response-sheet:last-child {
          break-after: auto;
        }
        .sheet-title {
          margin: 0 0 6px;
          font-family: Georgia, "Batang", serif;
          font-size: 23px;
          font-weight: 400;
        }
        .sheet-meta {
          margin: 0 0 20px;
          color: #777;
          font-size: 11px;
        }
        .answer-row {
          display: grid;
          grid-template-columns: 42mm 1fr;
          gap: 7mm;
          padding: 7px 0;
          border-top: 1px solid #e8e3db;
          break-inside: avoid;
        }
        .answer-label {
          color: #6e655b;
          font-size: 10px;
          font-weight: 700;
        }
        .answer-value {
          min-width: 0;
          font-size: 11px;
          line-height: 1.65;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .loading-message {
          max-width: 720px;
          margin: 60px auto;
          padding: 24px;
          background: #fff;
          font-size: 13px;
        }
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            background: #fff;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .pdf-toolbar {
            display: none;
          }
          .response-sheet {
            margin: 0;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="pdf-toolbar">
        <span>응답을 확인한 뒤 PDF로 저장할 수 있습니다.</span>
        <button
          type="button"
          onClick={savePdf}
          disabled={!data || data.responses.length === 0 || pdfDownloading}
        >
          {pdfDownloading ? "PDF 생성 중..." : "PDF로 저장"}
        </button>
      </div>

      {error ? (
        <p className="loading-message">{error}</p>
      ) : !data ? (
        <p className="loading-message">설문 응답을 불러오는 중입니다...</p>
      ) : data.responses.length === 0 ? (
        <p className="loading-message">저장된 설문 응답이 없습니다.</p>
      ) : (
        data.responses.map((response, index) => (
          <section className="response-sheet" key={response.id}>
            <h1 className="sheet-title">{data.campaign?.title || "예술인 노동 설문"} 응답</h1>
            <p className="sheet-meta">
              응답 {index + 1} / {data.responses.length} · PDF 생성일{" "}
              {new Date().toLocaleDateString("ko-KR")}
            </p>
            {LABOR_SURVEY_EXPORT_COLUMNS.map((column) => (
              <div className="answer-row" key={column.key}>
                <div className="answer-label">{column.header}</div>
                <div className="answer-value">{column.get(response) || "—"}</div>
              </div>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
