import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { emptyLaborSurveyAnswers } from "@/lib/laborSurveyTypes";
import type { AdminLaborSurveyResponse } from "@/lib/laborSurvey";
import { buildLaborSurveyPdf, resolveKoreanFontPath } from "@/lib/laborSurveyPdf";
import { laborSurveyPdfFilename } from "@/lib/laborSurveyPdfFilename";
import { laborSurveyToExcelXml, LABOR_SURVEY_EXPORT_COLUMNS } from "@/lib/laborSurveyExport";

function response(partial: Partial<AdminLaborSurveyResponse> & { laborExperience?: string }): AdminLaborSurveyResponse {
  const { laborExperience, answers: answerOverrides, ...rest } = partial;
  const answers = {
    ...emptyLaborSurveyAnswers(),
    artistDisplayName: "RRIP/Rupex",
    instagramId: "@rip.rupex",
    ageGroup: "30대",
    gender: "남",
    field: "대중음악",
    careerYears: "3–5년",
    laborExperience: laborExperience ?? "짧은 답변입니다.",
    responseToUnfair: "Hello, world! 특수문자 <>& \"quotes\" / #100%",
    ...answerOverrides,
  };
  return {
    id: rest.id ?? "r1",
    userId: rest.userId ?? "u1",
    displayName: rest.displayName ?? answers.artistDisplayName,
    instagramId: rest.instagramId ?? answers.instagramId,
    answers,
    consentResearch: rest.consentResearch ?? true,
    consentPolicy: rest.consentPolicy ?? true,
    consentNationalAssembly: rest.consentNationalAssembly ?? false,
    consentAnonymousCase: rest.consentAnonymousCase ?? true,
    declineNationalAssembly: rest.declineNationalAssembly ?? false,
    submittedAt: rest.submittedAt ?? Date.UTC(2026, 7, 21, 3, 0, 0),
  };
}

describe("laborSurveyPdfFilename", () => {
  it("uses the campaign title and KST date", () => {
    const noonKst = new Date("2026-08-30T03:00:00.000Z");
    expect(laborSurveyPdfFilename("예술인 솔직담백 수다회", noonKst)).toBe(
      "예술인_솔직담백_수다회_2026-08-30.pdf",
    );
  });
});

describe("buildLaborSurveyPdf", () => {
  it("finds the embedded Korean font", () => {
    expect(resolveKoreanFontPath()).toMatch(/NotoSansKR-Regular\.otf$/);
  });

  it("builds a one-page empty document when there are no responses", async () => {
    const result = await buildLaborSurveyPdf({
      campaignTitle: "예술인 솔직담백 수다회",
      responses: [],
    });
    expect(result.pageCount).toBe(1);
    expect(result.responseStartPages).toEqual([]);
    expect(Buffer.from(result.bytes.subarray(0, 5)).toString("utf8")).toBe("%PDF-");
  });

  it("starts each response on a new page", async () => {
    const result = await buildLaborSurveyPdf({
      campaignTitle: "예술인 솔직담백 수다회",
      responses: [response({ id: "a" }), response({ id: "b" }), response({ id: "c" })],
    });
    expect(result.pageCount).toBeGreaterThanOrEqual(3);
    expect(result.responseStartPages).toEqual([1, 2, 3]);
  });

  it("lets a long narrative flow onto extra pages instead of shrinking type", async () => {
    const long = Array.from({ length: 18 }, () =>
      "계약 없이 작업을 시작했고 정산이 미뤄진 경험이 반복되었습니다. 커뮤니케이션과 역할 분담이 불명확했습니다.",
    ).join(" ");

    const result = await buildLaborSurveyPdf({
      campaignTitle: "예술인 솔직담백 수다회",
      responses: [
        response({ id: "short", laborExperience: "두 줄 정도의 짧은 경험." }),
        response({ id: "long", laborExperience: long }),
      ],
    });

    expect(result.responseStartPages[0]).toBe(1);
    expect(result.responseStartPages[1]).toBeGreaterThan(1);
    const longResponsePages = result.pageCount - result.responseStartPages[1] + 1;
    expect(longResponsePages).toBeGreaterThan(1);
    expect(result.pageCount).toBeGreaterThan(2);
  }, 20000);

  it("wraps Korean, Latin, numbers, and punctuation without throwing", async () => {
    const result = await buildLaborSurveyPdf({
      campaignTitle: "예술인 솔직담백 수다회",
      responses: [
        response({
          id: "mixed",
          laborExperience: "한글 English 123 !@#$%^&*() <tag> \"quote\" / 경로\\파일.pdf",
        }),
      ],
    });
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(result.pageCount);
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
  });
});

describe("excel export remains intact", () => {
  it("still builds the spreadsheet from the same columns", () => {
    const xml = laborSurveyToExcelXml([response({ id: "xls" })], "설문응답");
    expect(xml).toContain("Workbook");
    expect(xml).toContain("노동 경험");
    expect(LABOR_SURVEY_EXPORT_COLUMNS).toHaveLength(25);
  });
});
