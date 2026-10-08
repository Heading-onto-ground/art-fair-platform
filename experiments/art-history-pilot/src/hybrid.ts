import { compactName } from "./resolve";

export type HistoryOrigin = "ROB_RESEARCHED" | "ARTIST_SUBMITTED" | "GALLERY_SUBMITTED" | "INSTITUTION_SUBMITTED";

export type HistoryVerification = "UNVERIFIED" | "SOURCE_ATTACHED" | "CORROBORATED" | "OFFICIAL_SOURCE" | "CONFLICT";

export type DatePrecisionWord = "DAY" | "MONTH" | "YEAR" | "UNKNOWN";

export type ProvenanceMark = {
  origin: HistoryOrigin;
  verification: HistoryVerification;
  sourceUrl: string | null;
};

export type DatedFact = {
  title: string;
  venue: string | null;
  start: string | null;
};

export type MatchResult = "ATTACHED" | "NEW" | "REVIEW_REQUIRED";

export type ParticipantLink =
  | { kind: "PILOT_ARTIST"; id: string; name: string }
  | { kind: "UNRESOLVED_PARTICIPANT"; name: string }
  | { kind: "REVIEW_REQUIRED"; name: string };

const YEAR = /^\d{4}$/;
const MONTH = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function officialMark(sourceUrl: string | null): ProvenanceMark {
  return {
    origin: "ROB_RESEARCHED",
    verification: sourceUrl ? "OFFICIAL_SOURCE" : "UNVERIFIED",
    sourceUrl,
  };
}

export function submissionMark(origin: Exclude<HistoryOrigin, "ROB_RESEARCHED">, sourceUrl: string | null): ProvenanceMark {
  return {
    origin,
    verification: sourceUrl ? "SOURCE_ATTACHED" : "UNVERIFIED",
    sourceUrl,
  };
}

export function provenanceLabel(marks: ProvenanceMark[]): string {
  if (marks.some((mark) => mark.verification === "CONFLICT")) return "Conflict";
  const official = marks.some((mark) => mark.origin === "ROB_RESEARCHED");
  const firstParty = marks.some((mark) => mark.origin !== "ROB_RESEARCHED");
  if (official && firstParty) return "Artist + official source";
  if (official) return "Official source";
  if (marks.some((mark) => mark.origin === "GALLERY_SUBMITTED")) return "Gallery added";
  if (marks.some((mark) => mark.origin === "INSTITUTION_SUBMITTED")) return "Institution added";
  return "Artist added";
}

export function enteredDate(raw: string | null, requested: DatePrecisionWord): { value: string | null; precision: DatePrecisionWord } {
  const value = (raw ?? "").trim();
  if (!value || requested === "UNKNOWN") return { value: null, precision: "UNKNOWN" };
  if (DAY.test(value)) return { value, precision: "DAY" };
  if (MONTH.test(value)) return { value, precision: "MONTH" };
  if (YEAR.test(value)) return { value, precision: "YEAR" };
  return { value: null, precision: "UNKNOWN" };
}

function specificTitle(title: string, venue: string | null): boolean {
  const trimmed = title.trim();
  return trimmed.length >= 24 && compactName(trimmed) !== compactName(venue ?? "");
}

function sameFact(left: string | null, right: string | null): boolean {
  return compactName(left ?? "") === compactName(right ?? "") && compactName(left ?? "").length > 0;
}

export function submissionMatch(existing: DatedFact, draft: DatedFact): MatchResult {
  if (!sameFact(existing.title, draft.title)) return "NEW";
  const sameVenue = sameFact(existing.venue, draft.venue);
  const existingYear = (existing.start ?? "").slice(0, 4);
  const draftYear = (draft.start ?? "").slice(0, 4);
  const sameYear = YEAR.test(existingYear) && existingYear === draftYear;
  if (!sameVenue || !sameYear || !specificTitle(draft.title, draft.venue)) return "REVIEW_REQUIRED";
  const left = existing.start ?? "";
  const right = draft.start ?? "";
  if (left.length > 4 && right.length > 4 && left.slice(0, 7) !== right.slice(0, 7)) return "REVIEW_REQUIRED";
  return "ATTACHED";
}

export function linkParticipant(name: string, people: { id: string; labels: string[] }[]): ParticipantLink {
  const target = compactName(name);
  if (!target) return { kind: "REVIEW_REQUIRED", name: name.trim() };
  const hits = people.filter((person) => person.labels.some((label) => compactName(label) === target));
  const ids = [...new Set(hits.map((person) => person.id))];
  if (ids.length > 1) return { kind: "REVIEW_REQUIRED", name: name.trim() };
  if (ids.length === 1) return { kind: "PILOT_ARTIST", id: ids[0], name: hits[0].labels[0] || name.trim() };
  return { kind: "UNRESOLVED_PARTICIPANT", name: name.trim() };
}
