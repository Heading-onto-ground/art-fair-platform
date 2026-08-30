import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import * as fontkit from "@pdf-lib/fontkit";
import { LABOR_SURVEY_EXPORT_COLUMNS } from "@/lib/laborSurveyExport";
import type { AdminLaborSurveyResponse } from "@/lib/laborSurvey";

// Noto Sans KR Regular (SIL OFL 1.1) — https://github.com/notofonts/noto-cjk
const FONT_FILENAME = "NotoSansKR-Regular.otf";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 46;
const MARGIN_BOTTOM = 42;
const LABEL_WIDTH = 118;
const GUTTER = 14;
const TITLE_SIZE = 15;
const META_SIZE = 9;
const LABEL_SIZE = 8.5;
const VALUE_SIZE = 10;
const LINE_GAP = 2.2;
const ROW_PADDING = 3.5;
const FOOTER_SIZE = 8;

const COLOR_TEXT = rgb(0.1, 0.1, 0.1);
const COLOR_MUTED = rgb(0.45, 0.45, 0.45);
const COLOR_LABEL = rgb(0.43, 0.4, 0.36);
const COLOR_RULE = rgb(0.91, 0.89, 0.86);

export type LaborSurveyPdfBuild = {
  bytes: Uint8Array;
  pageCount: number;
  /** 1-based page index where each response begins */
  responseStartPages: number[];
};

export function resolveKoreanFontPath(): string {
  const candidates = [
    join(process.cwd(), "lib", "fonts", FONT_FILENAME),
    join(__dirname, "fonts", FONT_FILENAME),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("korean_font_missing");
}

function sliceFittingPrefix(text: string, font: PDFFont, size: number, maxWidth: number): number {
  if (!text) return 0;
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text.length;

  let low = 1;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (font.widthOfTextAtSize(text.slice(0, mid), size) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return Math.max(1, low);
}

export function wrapTextToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const source = String(text ?? "").replace(/\r\n/g, "\n");
  const paragraphs = source.length ? source.split("\n") : ["—"];
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push("");
      continue;
    }

    let remaining = paragraph;
    while (remaining) {
      const count = sliceFittingPrefix(remaining, font, size, maxWidth);
      lines.push(remaining.slice(0, count));
      remaining = remaining.slice(count);
    }
  }

  return lines.length ? lines : ["—"];
}

type DrawState = {
  pdf: PDFDocument;
  font: PDFFont;
  page: PDFPage;
  y: number;
  pageCount: number;
  responseIndex: number;
  responseTotal: number;
  campaignTitle: string;
  generatedLabel: string;
  continuation: boolean;
};

function valueColumnWidth(): number {
  return A4_WIDTH - MARGIN_X * 2 - LABEL_WIDTH - GUTTER;
}

function lineHeight(size: number): number {
  return size + LINE_GAP;
}

function addPage(state: Omit<DrawState, "page" | "y" | "continuation"> & { continuation: boolean }): DrawState {
  const page = state.pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const next: DrawState = {
    ...state,
    page,
    y: A4_HEIGHT - MARGIN_TOP,
    pageCount: state.pageCount + 1,
  };
  drawHeader(next);
  drawFooter(next);
  return next;
}

function drawHeader(state: DrawState) {
  const title = state.continuation
    ? `${state.campaignTitle} 응답 (계속)`
    : `${state.campaignTitle} 응답`;
  state.page.drawText(title, {
    x: MARGIN_X,
    y: state.y,
    size: TITLE_SIZE,
    font: state.font,
    color: COLOR_TEXT,
  });
  state.y -= lineHeight(TITLE_SIZE) + 2;

  const meta = state.continuation
    ? `응답 ${state.responseIndex} / ${state.responseTotal} · 같은 응답의 이어서 · ${state.generatedLabel}`
    : `응답 ${state.responseIndex} / ${state.responseTotal} · ${state.generatedLabel}`;
  state.page.drawText(meta, {
    x: MARGIN_X,
    y: state.y,
    size: META_SIZE,
    font: state.font,
    color: COLOR_MUTED,
  });
  state.y -= lineHeight(META_SIZE) + 8;
}

function drawFooter(state: DrawState) {
  state.page.drawText(`${state.responseIndex} / ${state.responseTotal}`, {
    x: MARGIN_X,
    y: 22,
    size: FOOTER_SIZE,
    font: state.font,
    color: COLOR_MUTED,
  });
}

function ensureSpace(state: DrawState, needed: number): DrawState {
  if (state.y - needed >= MARGIN_BOTTOM) return state;
  return addPage({ ...state, continuation: true });
}

function drawField(state: DrawState, label: string, value: string): DrawState {
  const maxWidth = valueColumnWidth();
  const lines = wrapTextToWidth(value || "—", state.font, VALUE_SIZE, maxWidth);
  const valueLineH = lineHeight(VALUE_SIZE);
  const labelLineH = lineHeight(LABEL_SIZE);

  state = ensureSpace(state, ROW_PADDING + Math.max(labelLineH, valueLineH) + 4);

  state.page.drawLine({
    start: { x: MARGIN_X, y: state.y },
    end: { x: A4_WIDTH - MARGIN_X, y: state.y },
    thickness: 0.6,
    color: COLOR_RULE,
  });
  state.y -= ROW_PADDING + VALUE_SIZE;

  let firstLine = true;
  for (const line of lines) {
    state = ensureSpace(state, valueLineH);
    if (firstLine || state.continuation) {
      const shownLabel = firstLine ? label : `${label} (계속)`;
      state.page.drawText(shownLabel, {
        x: MARGIN_X,
        y: state.y,
        size: LABEL_SIZE,
        font: state.font,
        color: COLOR_LABEL,
        maxWidth: LABEL_WIDTH,
      });
    }
    if (line) {
      state.page.drawText(line, {
        x: MARGIN_X + LABEL_WIDTH + GUTTER,
        y: state.y,
        size: VALUE_SIZE,
        font: state.font,
        color: COLOR_TEXT,
      });
    }
    state.y -= valueLineH;
    firstLine = false;
    state = { ...state, continuation: false };
  }

  state.y -= 2;
  return state;
}

export async function buildLaborSurveyPdf(input: {
  campaignTitle: string;
  responses: AdminLaborSurveyResponse[];
  generatedAt?: Date;
}): Promise<LaborSurveyPdfBuild> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(readFileSync(resolveKoreanFontPath()), { subset: true });

  const campaignTitle = input.campaignTitle.trim() || "예술인 노동 설문";
  const generatedAt = input.generatedAt ?? new Date();
  const generatedLabel = `PDF 생성일 ${generatedAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`;
  const responses = input.responses;
  const responseStartPages: number[] = [];

  if (responses.length === 0) {
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawText(`${campaignTitle} 응답`, {
      x: MARGIN_X,
      y: A4_HEIGHT - MARGIN_TOP,
      size: TITLE_SIZE,
      font,
      color: COLOR_TEXT,
    });
    page.drawText("저장된 설문 응답이 없습니다.", {
      x: MARGIN_X,
      y: A4_HEIGHT - MARGIN_TOP - 28,
      size: VALUE_SIZE,
      font,
      color: COLOR_MUTED,
    });
    return { bytes: await pdf.save(), pageCount: 1, responseStartPages };
  }

  let state: DrawState | null = null;
  for (let i = 0; i < responses.length; i += 1) {
    const response = responses[i];
    state = addPage({
      pdf,
      font,
      pageCount: state?.pageCount ?? 0,
      responseIndex: i + 1,
      responseTotal: responses.length,
      campaignTitle,
      generatedLabel,
      continuation: false,
    });
    responseStartPages.push(state.pageCount);

    for (const column of LABOR_SURVEY_EXPORT_COLUMNS) {
      state = drawField(state, column.header, column.get(response));
    }
  }

  const bytes = await pdf.save();
  return { bytes, pageCount: state?.pageCount ?? 0, responseStartPages };
}
