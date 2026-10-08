import { sha256 } from "./hash";
import { dateFromEvidence, type DatePrecision, type PartialDate } from "./dates";
import type { SourceTier } from "./policy";

export const EVIDENCE_CHAR_CAP = 200;

export type ClaimStatus = "AUTO_ACCEPTED" | "PILOT_ACCEPTED" | "REVIEW_REQUIRED" | "REJECTED";

export type FieldEvidence = {
  field: string;
  value: string;
  evidence: string;
  sourceUrl: string;
  sourceTier: SourceTier;
  retrievedAt: string;
  extractionMethod: "human_verified_span";
  confidence: number;
};

export type ExhibitionDraft = {
  title: string;
  titleEvidence: string;
  dateEvidence: string | null;
  venue: string | null;
  venueEvidence: string | null;
  city: string | null;
  cityEvidence: string | null;
  artists: { name: string; evidence: string }[];
  curators: { name: string; evidence: string }[];
  exhibitionType: string | null;
  exhibitionTypeEvidence: string | null;
  sourceUrl: string;
  sourceTier: SourceTier;
  sourceAllowed: boolean;
  pilotManualEligible?: boolean;
  country?: string | null;
  countryEvidence?: string | null;
  retrievedAt: string;
  pageText: string;
  confidence: number;
};

export type ExhibitionRecord = {
  id: string;
  title: string;
  start: PartialDate | null;
  end: PartialDate | null;
  datePrecision: DatePrecision | "unknown";
  venueName: string | null;
  city: string | null;
  country: string | null;
  artistNames: string[];
  curatorNames: string[];
  exhibitionType: string | null;
  status: ClaimStatus;
  statusReason: string;
  evidences: FieldEvidence[];
  sourceUrl: string;
  sourceTier: SourceTier;
  usageStatus: "PILOT_ONLY" | null;
  productionClearance: "UNRESOLVED" | null;
  additionalSources?: string[];
};

const CONFIDENCE_AUTO = 0.85;

function evidenceOk(evidence: string, pageText: string): boolean {
  return evidence.length > 0 && evidence.length <= EVIDENCE_CHAR_CAP && pageText.includes(evidence);
}

export function buildExhibition(draft: ExhibitionDraft): ExhibitionRecord {
  const evidences: FieldEvidence[] = [];
  const failures: string[] = [];

  const add = (field: string, value: string | null, evidence: string | null) => {
    if (!value || !evidence) return;
    if (!evidenceOk(evidence, draft.pageText)) {
      failures.push(`bad_evidence:${field}`);
      return;
    }
    if (!evidence.includes(value) && field !== "date") {
      failures.push(`value_not_in_evidence:${field}`);
      return;
    }
    evidences.push({
      field,
      value,
      evidence,
      sourceUrl: draft.sourceUrl,
      sourceTier: draft.sourceTier,
      retrievedAt: draft.retrievedAt,
      extractionMethod: "human_verified_span",
      confidence: draft.confidence,
    });
  };

  add("title", draft.title, draft.titleEvidence);
  add("venue", draft.venue, draft.venueEvidence);
  add("city", draft.city, draft.cityEvidence);
  add("country", draft.country ?? null, draft.countryEvidence ?? null);
  add("exhibitionType", draft.exhibitionType, draft.exhibitionTypeEvidence);
  for (const artist of draft.artists) add(`artist:${artist.name}`, artist.name, artist.evidence);
  for (const curator of draft.curators) add(`curator:${curator.name}`, curator.name, curator.evidence);

  let start: PartialDate | null = null;
  let end: PartialDate | null = null;
  let datePrecision: DatePrecision | "unknown" = "unknown";
  if (draft.dateEvidence) {
    if (!evidenceOk(draft.dateEvidence, draft.pageText)) {
      failures.push("bad_evidence:date");
    } else {
      const parsed = dateFromEvidence(draft.dateEvidence);
      if (parsed.status === "ambiguous") failures.push("ambiguous_date");
      if (parsed.status === "none") failures.push("undated");
      if (parsed.status === "ok") {
        start = parsed.start;
        end = parsed.end;
        datePrecision = parsed.start.precision;
        evidences.push({
          field: "date",
          value: parsed.end ? `${parsed.start.value}/${parsed.end.value}` : parsed.start.value,
          evidence: draft.dateEvidence,
          sourceUrl: draft.sourceUrl,
          sourceTier: draft.sourceTier,
          retrievedAt: draft.retrievedAt,
          extractionMethod: "human_verified_span",
          confidence: draft.confidence,
        });
      }
    }
  } else {
    failures.push("undated");
  }

  const artistNames = draft.artists.map((artist) => artist.name);
  const curatorNames = draft.curators.map((curator) => curator.name);
  const id = sha256(`${draft.title}|${draft.sourceUrl}|${start?.value ?? ""}`).slice(0, 16);

  let status: ClaimStatus = "AUTO_ACCEPTED";
  let statusReason = "evidence_checked";

  if (!draft.pilotManualEligible && (!draft.sourceAllowed || draft.sourceTier !== 1)) {
    status = "REJECTED";
    statusReason = draft.sourceTier === 2 ? "TIER2_CANNOT_CREATE" : "SOURCE_NOT_ALLOWLISTED";
  } else if (failures.length > 0 || artistNames.length === 0 || !draft.title) {
    status = "REJECTED";
    statusReason = failures[0] ?? "missing_required_fact";
  } else if (!draft.venue || draft.confidence < CONFIDENCE_AUTO) {
    status = "REVIEW_REQUIRED";
    statusReason = !draft.venue ? "venue_missing" : "low_confidence";
  } else if (draft.pilotManualEligible) {
    status = "PILOT_ACCEPTED";
    statusReason = "pilot_manual_evidence_checked";
  }

  return {
    id,
    title: draft.title,
    start,
    end,
    datePrecision,
    venueName: draft.venue,
    city: draft.city,
    country: draft.country ?? null,
    artistNames,
    curatorNames,
    exhibitionType: draft.exhibitionType,
    status,
    statusReason,
    evidences,
    sourceUrl: draft.sourceUrl,
    sourceTier: draft.sourceTier,
    usageStatus: draft.pilotManualEligible ? "PILOT_ONLY" : null,
    productionClearance: draft.pilotManualEligible ? "UNRESOLVED" : null,
  };
}

export function isRecordedExhibition(record: ExhibitionRecord): boolean {
  return record.status === "AUTO_ACCEPTED" || record.status === "PILOT_ACCEPTED";
}
