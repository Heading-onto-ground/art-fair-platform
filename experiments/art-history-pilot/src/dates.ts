export type DatePrecision = "year" | "month" | "day";

export type PartialDate = {
  value: string;
  precision: DatePrecision;
};

export type DateParse =
  | { status: "ok"; start: PartialDate; end: PartialDate | null }
  | { status: "none" }
  | { status: "ambiguous" };

const MONTHS: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

function pad(value: string): string {
  return value.padStart(2, "0");
}

function fromParts(year: string, month?: string, day?: string): PartialDate {
  if (month && day) {
    return { value: `${year}-${pad(month)}-${pad(day)}`, precision: "day" };
  }
  if (month) return { value: `${year}-${pad(month)}`, precision: "month" };
  return { value: year, precision: "year" };
}

function parseOne(raw: string): PartialDate | null {
  const text = raw.trim();
  let match = text.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/);
  if (match) return fromParts(match[1], match[2], match[3]);
  match = text.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (match) return fromParts(match[1], match[2]);
  match = text.match(/^(\d{4})년$/);
  if (match) return fromParts(match[1]);
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return fromParts(match[1], match[2], match[3]);
  match = text.match(/^(\d{4})-(\d{2})$/);
  if (match) return fromParts(match[1], match[2]);
  match = text.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if (match) return fromParts(match[1], match[2], match[3]);
  match = text.match(/^(\d{4})\.(\d{1,2})\.?$/);
  if (match) return fromParts(match[1], match[2]);
  match = text.match(/^(\d{4})$/);
  if (match) return fromParts(match[1]);
  match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (match && MONTHS[match[2].toLowerCase()]) {
    return fromParts(match[3], MONTHS[match[2].toLowerCase()], match[1]);
  }
  match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (match && MONTHS[match[1].toLowerCase()]) {
    return fromParts(match[3], MONTHS[match[1].toLowerCase()], match[2]);
  }
  match = text.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (match && MONTHS[match[1].toLowerCase()]) {
    return fromParts(match[2], MONTHS[match[1].toLowerCase()]);
  }
  return null;
}

const DATE_TOKEN =
  /\d{4}년\s*\d{1,2}월\s*\d{1,2}일|\d{4}년\s*\d{1,2}월|\d{4}년|\d{4}-\d{2}-\d{2}|\d{4}-\d{2}|\d{4}\.\d{1,2}\.\d{1,2}\.?|\d{4}\.\d{1,2}\.?|\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},\s*\d{4}|[A-Za-z]+\s+\d{4}|\b\d{4}\b/g;

function findDates(evidence: string): PartialDate[] {
  const dates: PartialDate[] = [];
  for (const match of evidence.matchAll(DATE_TOKEN)) {
    const raw = match[0].trim();
    const date = parseOne(raw);
    if (date) {
      dates.push(date);
      continue;
    }
    const year = raw.match(/\d{4}/);
    if (!year) continue;
    const parsedYear = parseOne(year[0]);
    if (parsedYear) dates.push(parsedYear);
  }
  return dates;
}

function monthNumber(name: string): string | null {
  return MONTHS[name.toLowerCase().replace(/\.$/, "")] ?? null;
}

function rangeDates(
  startMonth: string,
  startDay: string,
  endMonth: string,
  endDay: string,
  endYear: number,
): DateParse | null {
  const startMonthNumber = monthNumber(startMonth) ?? (Number(startMonth) ? pad(startMonth) : null);
  const endMonthNumber = monthNumber(endMonth) ?? (Number(endMonth) ? pad(endMonth) : null);
  if (!startMonthNumber || !endMonthNumber) return null;
  const startYear = Number(startMonthNumber) > Number(endMonthNumber) ? endYear - 1 : endYear;
  return {
    status: "ok",
    start: fromParts(String(startYear), startMonthNumber, startDay),
    end: fromParts(String(endYear), endMonthNumber, endDay),
  };
}

function parseRange(evidence: string): DateParse | null {
  const iso = evidence.match(
    /((?:19|20)\d{2})-(\d{2})-(\d{2})\s*[~\-–—]\s*((?:19|20)\d{2})-(\d{2})-(\d{2})/,
  );
  if (iso) {
    return {
      status: "ok",
      start: fromParts(iso[1], iso[2], iso[3]),
      end: fromParts(iso[4], iso[5], iso[6]),
    };
  }
  const ranges = [
    ...evidence.matchAll(
      /(\d{1,2})월\s*(\d{1,2})일\s*[~\-–—]\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g,
    ),
  ];
  const english = [
    ...evidence.matchAll(
      /([A-Za-z]+)\.?\s+(\d{1,2})\s*[~\-–—]\s*([A-Za-z]+)\.?\s+(\d{1,2}),\s*((?:19|20)\d{2})/g,
    ),
  ];
  const dayFirst = [
    ...evidence.matchAll(
      /(\d{1,2})\s+([A-Za-z]+)\s*[~\-–—]\s*(\d{1,2})\s+([A-Za-z]+)\s+((?:19|20)\d{2})/g,
    ),
  ];
  if (ranges.length + english.length + dayFirst.length > 1) return { status: "ambiguous" };
  const korean = ranges[0];
  if (korean) {
    return rangeDates(korean[1], korean[2], korean[4], korean[5], Number(korean[3]));
  }
  const match = english[0];
  if (match) return rangeDates(match[1], match[2], match[3], match[4], Number(match[5]));
  const day = dayFirst[0];
  if (!day) return null;
  return rangeDates(day[2], day[1], day[4], day[3], Number(day[5]));
}

export function dateFromEvidence(evidence: string): DateParse {
  const ranged = parseRange(evidence);
  if (ranged) return ranged;
  const dates = findDates(evidence);
  if (dates.length === 0) return { status: "none" };
  if (dates.length > 2) return { status: "ambiguous" };
  return { status: "ok", start: dates[0], end: dates[1] ?? null };
}
