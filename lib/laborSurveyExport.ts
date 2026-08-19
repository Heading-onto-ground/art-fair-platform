import type { AdminLaborSurveyResponse } from "@/lib/laborSurvey";
import {
  CONTRACT_FREQ_OPTIONS,
  CONTRACT_TIMING_OPTIONS,
  type LaborSurveyAnswers,
} from "@/lib/laborSurveyTypes";

export type ExportColumn = { key: string; header: string; get: (r: AdminLaborSurveyResponse) => string };

function yn(v: string | boolean | undefined): string {
  if (typeof v === "boolean") return v ? "예" : "아니오";
  if (v === "yes" || v === "mixed") return "예";
  if (v === "no") return "아니오";
  return "";
}

function labelOf(
  options: Array<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export const LABOR_SURVEY_EXPORT_COLUMNS: ExportColumn[] = [
  {
    key: "submittedAt",
    header: "제출일시",
    get: (r) => new Date(r.submittedAt).toLocaleString("ko-KR"),
  },
  { key: "artistDisplayName", header: "작가명", get: (r) => r.displayName ?? r.answers.artistDisplayName ?? "" },
  { key: "instagramId", header: "인스타 아이디", get: (r) => r.instagramId ?? r.answers.instagramId ?? "" },
  { key: "ageGroup", header: "연령", get: (r) => r.answers.ageGroup ?? "" },
  { key: "gender", header: "성별", get: (r) => r.answers.gender ?? "" },
  { key: "field", header: "분야", get: (r) => r.answers.field },
  { key: "careerYears", header: "활동 경력", get: (r) => r.answers.careerYears },
  { key: "employmentType", header: "전업·겸업", get: (r) => r.answers.employmentType },
  { key: "isFreelancer", header: "프리랜서 여부", get: (r) => yn(r.answers.isFreelancer) },
  { key: "activityForms", header: "주요 활동 형태", get: (r) => r.answers.activityForms },
  {
    key: "hasWrittenContract",
    header: "서면 계약 빈도",
    get: (r) => labelOf(CONTRACT_FREQ_OPTIONS, r.answers.hasWrittenContract),
  },
  {
    key: "contractTiming",
    header: "계약 시점",
    get: (r) => labelOf(CONTRACT_TIMING_OPTIONS, r.answers.contractTiming),
  },
  { key: "noContractReceived", header: "계약 없이 시작 경험", get: (r) => yn(r.answers.noContractReceived) },
  { key: "verbalThenWritten", header: "구두 후 서면 계약", get: (r) => yn(r.answers.verbalThenWritten) },
  { key: "payCutOrDelay", header: "보수 삭감·지연", get: (r) => yn(r.answers.payCutOrDelay) },
  { key: "responseToUnfair", header: "부당 상황 대응", get: (r) => r.answers.responseToUnfair },
  { key: "hardToAskContract", header: "계약서 요구 어려움", get: (r) => yn(r.answers.hardToAskContract) },
  { key: "hardToAskContractReason", header: "계약서 요구 어려웠던 이유", get: (r) => r.answers.hardToAskContractReason },
  { key: "fearRetaliation", header: "불이익 우려", get: (r) => yn(r.answers.fearRetaliation) },
  { key: "laborExperience", header: "노동 경험 (서술)", get: (r) => r.answers.laborExperience },
  { key: "consentResearch", header: "동의_연구자료", get: (r) => yn(r.consentResearch) },
  { key: "consentPolicy", header: "동의_정책자료", get: (r) => yn(r.consentPolicy) },
  { key: "consentNationalAssembly", header: "동의_국감제보", get: (r) => yn(r.consentNationalAssembly) },
  { key: "consentAnonymousCase", header: "동의_익명사례", get: (r) => yn(r.consentAnonymousCase) },
  { key: "declineNationalAssembly", header: "국감활용_비동의", get: (r) => yn(r.declineNationalAssembly) },
];

function escapeCsvCell(value: string): string {
  const s = String(value ?? "").replace(/\r?\n/g, " ");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLaborSurveyExportRows(responses: AdminLaborSurveyResponse[]): string[][] {
  const header = LABOR_SURVEY_EXPORT_COLUMNS.map((c) => c.header);
  const rows = responses.map((r) => LABOR_SURVEY_EXPORT_COLUMNS.map((c) => c.get(r)));
  return [header, ...rows];
}

/** UTF-8 CSV with BOM — opens cleanly in Excel */
export function laborSurveyToCsv(responses: AdminLaborSurveyResponse[]): string {
  const rows = buildLaborSurveyExportRows(responses);
  const body = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  return `\uFEFF${body}`;
}

/** Excel 2003 XML — opens in Excel as spreadsheet without extra npm packages */
export function laborSurveyToExcelXml(responses: AdminLaborSurveyResponse[], sheetName = "설문응답"): string {
  const rows = buildLaborSurveyExportRows(responses);
  const xmlRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>${xmlRows}</Table>
  </Worksheet>
</Workbook>`;
}

export function laborSurveyExportFilename(campaignTitle: string, ext: "xls" | "csv"): string {
  const slug = campaignTitle.replace(/[^\w\uAC00-\uD7A3]+/g, "_").slice(0, 40) || "labor-survey";
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}_${date}.${ext}`;
}

/** Flat row for admin table preview */
export function flattenResponseForTable(r: AdminLaborSurveyResponse): Record<string, string> {
  const out: Record<string, string> = {};
  for (const col of LABOR_SURVEY_EXPORT_COLUMNS) {
    out[col.key] = col.get(r);
  }
  return out;
}

export function summarizeAnswers(a: LaborSurveyAnswers): string {
  return [a.ageGroup, a.gender, a.field, a.careerYears].filter(Boolean).join(" · ");
}
