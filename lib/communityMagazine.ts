import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type MagazineReport = {
  title: string;
  generatedAt: string;
  todayTopic: string;
  goodOpinions: string[];
  keyTakeaways: string[];
};

const POSITIVE_PATTERNS = [
  /좋/iu,
  /공감/iu,
  /최고/iu,
  /감사/iu,
  /유익/iu,
  /인상/iu,
  /great/iu,
  /good/iu,
  /awesome/iu,
  /love/iu,
  /helpful/iu,
];

const STOPWORDS = new Set([
  "그리고",
  "그래서",
  "오늘",
  "이제",
  "그냥",
  "하는",
  "하면",
  "합니다",
  "이런",
  "저런",
  "that",
  "this",
  "with",
  "from",
  "have",
  "will",
  "your",
  "about",
]);

type JsonMessageShape =
  | string
  | { message?: string; text?: string; content?: string; body?: string; speaker?: string; author?: string; user?: string };

function normalizeLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[\-\*\d\.\)\s]+/, "").trim());
}

function parseJsonTranscript(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const toLine = (entry: JsonMessageShape): string => {
      if (typeof entry === "string") return entry.trim();
      const body = (entry.message || entry.text || entry.content || entry.body || "").trim();
      const speaker = (entry.speaker || entry.author || entry.user || "").trim();
      return speaker && body ? `${speaker}: ${body}` : body;
    };

    if (Array.isArray(parsed)) {
      return parsed.map((entry) => toLine(entry as JsonMessageShape)).filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      const maybeMessages = (parsed as { messages?: JsonMessageShape[]; conversation?: JsonMessageShape[] });
      const entries = maybeMessages.messages || maybeMessages.conversation || [];
      return entries.map((entry) => toLine(entry)).filter(Boolean);
    }
  } catch {
    return [];
  }
  return [];
}

export function parseTranscriptInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = parseJsonTranscript(trimmed);
    if (parsed.length > 0) return parsed.join("\n");
  }
  return trimmed;
}

function extractMessageBody(line: string): string {
  const colonIdx = line.indexOf(":");
  if (colonIdx > 0 && colonIdx < 24) {
    return line.slice(colonIdx + 1).trim();
  }
  return line;
}

function tokenize(text: string): string[] {
  const matches = text
    .toLowerCase()
    .match(/[a-z]{3,}|[가-힣]{2,}/g);
  if (!matches) return [];
  return matches.filter((word) => !STOPWORDS.has(word));
}

function rankTopics(lines: string[]): string[] {
  const freq = new Map<string, number>();
  for (const line of lines) {
    const body = extractMessageBody(line);
    for (const token of tokenize(body)) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

function findGoodOpinions(lines: string[]): string[] {
  const picked: string[] = [];
  for (const line of lines) {
    const body = extractMessageBody(line);
    if (POSITIVE_PATTERNS.some((pattern) => pattern.test(body))) {
      picked.push(body);
    }
    if (picked.length >= 4) break;
  }
  return picked.length > 0 ? picked : lines.slice(0, 3).map(extractMessageBody);
}

function summarizeTakeaways(lines: string[]): string[] {
  const longLines = lines
    .map(extractMessageBody)
    .filter((line) => line.length >= 24);
  const source = longLines.length > 0 ? longLines : lines.map(extractMessageBody);
  return source.slice(0, 4).map((line) => line.replace(/\s+/g, " ").trim());
}

export function analyzeTranscript(rawTranscript: string, title?: string): MagazineReport {
  const lines = normalizeLines(parseTranscriptInput(rawTranscript));
  if (lines.length === 0) {
    throw new Error("대화 내용이 비어 있습니다.");
  }

  const topics = rankTopics(lines);
  const todayTopic = topics.length ? topics.join(" / ") : "커뮤니티 주요 대화";

  return {
    title: title?.trim() || "Community Daily Magazine",
    generatedAt: new Date().toISOString(),
    todayTopic,
    goodOpinions: findGoodOpinions(lines),
    keyTakeaways: summarizeTakeaways(lines),
  };
}

function wrapText(text: string, maxChars = 64): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

export async function buildMagazinePdf(report: MagazineReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const SIDE = 48;
  const TOP = 796;

  const addPage = () => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 120,
      width: PAGE_WIDTH,
      height: 120,
      color: rgb(0.96, 0.94, 0.9),
    });
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: 22,
      color: rgb(0.96, 0.94, 0.9),
    });
    return page;
  };

  let page = addPage();
  let y = TOP;

  const ensureSpace = (needed: number) => {
    if (y - needed > 40) return;
    page = addPage();
    y = TOP;
  };

  const drawLine = (text: string, size = 12, isBold = false) => {
    const wrapped = wrapText(text, 70);
    ensureSpace(wrapped.length * (size + 6) + 8);
    for (const row of wrapped) {
      page.drawText(row, {
        x: SIDE,
        y,
        size,
        font: isBold ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= size + 6;
    }
  };

  drawLine("COMMUNITY DAILY MAGAZINE", 10, true);
  drawLine(report.title, 22, true);
  drawLine(`Generated: ${report.generatedAt}`, 10);
  y -= 8;
  drawLine("Today's Topic", 14, true);
  drawLine(report.todayTopic, 12);

  y -= 6;
  drawLine("Good Opinions", 14, true);
  report.goodOpinions.forEach((line, idx) => drawLine(`${idx + 1}. ${line}`, 11));

  y -= 6;
  drawLine("Key Takeaways", 14, true);
  report.keyTakeaways.forEach((line, idx) => drawLine(`${idx + 1}. ${line}`, 11));

  ensureSpace(30);
  y -= 8;
  drawLine("Published by ROB Community", 10);

  return pdf.save();
}
