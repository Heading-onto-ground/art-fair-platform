import { compactName } from "./resolve";

export type IdentityStatus = "QID_CONFIRMED" | "QID_UNRESOLVED" | "QID_AMBIGUOUS";

export type BirthRecord = {
  year: number | null;
  date: string | null;
  precision: number | null;
};

export type ParsedEntity = {
  qid: string;
  englishLabel: string | null;
  koreanLabel: string | null;
  aliases: string[];
  descriptions: string[];
  birth: BirthRecord;
  participantInStatements: number;
};

export type SeedName = {
  canonicalKoreanName: string;
  romanizedNames: string[];
  otherAliases: string[];
  requireKorean?: boolean;
  requireBoth?: boolean;
};

const VISUAL_ARTIST =
  /\b(artist|painter|sculptor|photographer|printmaker|ceramicist|visual artist)\b|미술가|시각예술가|조각가|사진작가|사진가|화가|설치미술|현대미술가/i;
const NOT_VISUAL =
  /martial artist|\b(singer|footballer|politician|actor|idol|entrepreneur|businessperson|poet|novelist)\b|시인|소설가|정치인|가수|배우|운동선수/i;

export function wikipediaItemId(html: string): string | null {
  const match = html.match(/"wgWikibaseItemId":"(Q\d+)"/);
  return match?.[1] ?? null;
}

function textValue(entry: unknown): string | null {
  if (!entry || typeof entry !== "object" || !("value" in entry)) return null;
  const value = (entry as { value?: unknown }).value;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function languageMap(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function labelsFor(value: unknown, language: string): string[] {
  const bag = languageMap(value);
  const entry = bag[language];
  if (Array.isArray(entry)) {
    return entry.map(textValue).filter((item): item is string => Boolean(item));
  }
  const single = textValue(entry);
  return single ? [single] : [];
}

function parseBirth(claims: unknown): BirthRecord {
  const bag = languageMap(claims);
  const statements = bag.P569;
  if (!Array.isArray(statements)) return { year: null, date: null, precision: null };
  const found: BirthRecord[] = [];
  for (const statement of statements) {
    if (!statement || typeof statement !== "object") continue;
    const value = (
      statement as {
        mainsnak?: { datavalue?: { value?: { time?: string; precision?: number } } };
      }
    ).mainsnak?.datavalue?.value;
    if (!value?.time || value.precision == null || value.precision < 9) continue;
    const year = Number(value.time.slice(1, 5));
    const month = value.time.slice(6, 8);
    const day = value.time.slice(9, 11);
    if (!Number.isInteger(year) || year < 1800 || year > 2026) continue;
    const date =
      value.precision >= 11 && month !== "00" && day !== "00"
        ? `${year}-${month}-${day}`
        : value.precision === 10 && month !== "00"
          ? `${year}-${month}`
          : null;
    found.push({ year, date, precision: value.precision });
  }
  const years = [...new Set(found.map((item) => item.year))];
  if (years.length !== 1) return { year: null, date: null, precision: null };
  const mostPrecise = [...found].sort((a, b) => (b.precision ?? 0) - (a.precision ?? 0))[0];
  return mostPrecise ?? { year: years[0] ?? null, date: null, precision: 9 };
}

export function parseEntityData(payload: unknown, qid: string): ParsedEntity | null {
  if (!payload || typeof payload !== "object") return null;
  const entities = (payload as { entities?: unknown }).entities;
  const entity = languageMap(entities)[qid];
  if (!entity || typeof entity !== "object") return null;
  const record = entity as {
    labels?: unknown;
    aliases?: unknown;
    descriptions?: unknown;
    claims?: unknown;
  };
  const english = labelsFor(record.labels, "en");
  const korean = labelsFor(record.labels, "ko");
  const aliases = [...labelsFor(record.aliases, "en"), ...labelsFor(record.aliases, "ko")];
  const descriptions = [
    ...labelsFor(record.descriptions, "en"),
    ...labelsFor(record.descriptions, "ko"),
  ];
  const claims = languageMap(record.claims);
  const participant = claims.P1344;
  return {
    qid,
    englishLabel: english[0] ?? null,
    koreanLabel: korean[0] ?? null,
    aliases,
    descriptions,
    birth: parseBirth(record.claims),
    participantInStatements: Array.isArray(participant) ? participant.length : 0,
  };
}

export function acceptEntity(seed: SeedName, entity: ParsedEntity): { accept: boolean; reason: string } {
  const koreanNames = [entity.koreanLabel, ...entity.aliases].filter((name): name is string => Boolean(name));
  const englishNames = [entity.englishLabel, ...entity.aliases].filter((name): name is string => Boolean(name));
  const seedEnglish = [...seed.romanizedNames, ...seed.otherAliases];
  const koreanOk = koreanNames.some(
    (name) => compactName(name) === compactName(seed.canonicalKoreanName),
  );
  const koreanConflict =
    Boolean(entity.koreanLabel) &&
    compactName(entity.koreanLabel ?? "") !== compactName(seed.canonicalKoreanName);
  const englishOk = englishNames.some((name) =>
    seedEnglish.some((expected) => compactName(name) === compactName(expected) && compactName(expected).length > 1),
  );
  if (koreanConflict) return { accept: false, reason: "korean_label_conflict" };
  if (seed.requireBoth && (!koreanOk || !englishOk)) {
    return { accept: false, reason: "ambiguous_name_needs_both_labels" };
  }
  if (seed.requireKorean && !koreanOk) return { accept: false, reason: "common_name_needs_korean_label" };
  if (!koreanOk && !englishOk) return { accept: false, reason: "name_mismatch" };
  const description = entity.descriptions.join(" ");
  if (!VISUAL_ARTIST.test(description) || NOT_VISUAL.test(description)) {
    return { accept: false, reason: "not_visual_artist" };
  }
  return { accept: true, reason: "label_and_artist_description" };
}

export function markSharedQids<T extends { qid: string | null; status: IdentityStatus; reason: string }>(
  rows: T[],
): Array<Omit<T, "status" | "reason"> & { status: IdentityStatus; reason: string }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.status === "QID_CONFIRMED" && row.qid) counts.set(row.qid, (counts.get(row.qid) ?? 0) + 1);
  }
  return rows.map((row) => {
    if (!row.qid || (counts.get(row.qid) ?? 0) < 2) return row;
    return { ...row, status: "QID_AMBIGUOUS", reason: "same_qid_on_two_seed_artists" };
  });
}
