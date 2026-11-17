import { listingFacts } from "@/lib/openCall/listingFacts";
import {
  hostOf,
  opportunityCycleKey,
  opportunityFingerprint,
} from "@/lib/opportunity/fingerprint";
import type {
  OpenCallClass,
  OpportunityStatus,
  OpportunityType,
  OrganizerType,
  SourceClass,
  VerificationStatus,
} from "@/lib/opportunity/model";

export type LegacyOpenCallInput = {
  id: string;
  gallery: string;
  city?: string | null;
  country?: string | null;
  theme?: string | null;
  deadline?: string | null;
  isExternal?: boolean | null;
  externalUrl?: string | null;
  galleryWebsite?: string | null;
  galleryDescription?: string | null;
  createdAt?: Date | string | null;
};

export type OpportunityDraft = {
  classification: OpenCallClass;
  type: OpportunityType | null;
  title: string;
  organizerName: string | null;
  organizerType: OrganizerType | null;
  country: string | null;
  city: string | null;
  locationText: string | null;
  deadline: string | null;
  deadlineTimezone: null;
  applicationStart: string | null;
  eventStart: null;
  eventEnd: null;
  feeAmount: number | null;
  feeCurrency: string | null;
  feeRequired: boolean | null;
  eligibility: string | null;
  disciplines: string | null;
  internationalEligible: boolean | null;
  description: string | null;
  officialUrl: string | null;
  sourceUrl: string | null;
  sourceHost: string | null;
  sourceLanguage: string | null;
  sourceClass: SourceClass | null;
  status: OpportunityStatus;
  verificationStatus: VerificationStatus;
  fingerprint: string;
  cycleKey: string | null;
  legacyOpenCallId: string;
  discoveredAt: Date | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const REPRINT_HOSTS = ["blog.naver.com", "m.blog.naver.com", "rss.blog.naver.com"];

function labeled(text: string, label: string) {
  const match = text.match(new RegExp(
    `${label}\\s*[▶:>：]\\s*([\\s\\S]*?)(?=\\s*(?:접수일정|주관|주소|연락처|이메일|홈페이지|참가비|지원\\s*자격|응모\\s*자격|참가\\s*자격)\\s*[▶:>：]|$)`,
    "i",
  ));
  return match?.[1]?.trim() || null;
}

function isReprintHost(url?: string | null) {
  const host = hostOf(url);
  return REPRINT_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
}

export function deadlineStatus(deadline: string | null, now: Date): OpportunityStatus {
  if (!deadline || !DATE.test(deadline)) return "UNKNOWN";
  const end = new Date(`${deadline}T23:59:59Z`);
  if (Number.isNaN(end.getTime())) return "UNKNOWN";
  return end.getTime() >= now.getTime() ? "OPEN" : "CLOSED";
}

export function classifyOpenCall(call: LegacyOpenCallInput, now = new Date()): OpenCallClass {
  const gallery = String(call.gallery || "").trim().toLowerCase();
  const city = String(call.city || "").trim().toLowerCase();
  if (/^oc_\d+$/.test(call.id)) return "SYNTHETIC_SEED";
  if (gallery === "noas" || city === "seould") return "TEST_OR_DEMO";

  const deadline = String(call.deadline || "").trim();
  const status = deadlineStatus(deadline, now);
  const external = Boolean(call.isExternal);
  const hasSource = Boolean(String(call.externalUrl || "").trim());
  if (external && !hasSource) return "INVALID";
  if (status === "UNKNOWN") return external ? "INVALID" : "UNKNOWN";
  if (external) return status === "OPEN" ? "VALID_EXTERNAL" : "EXPIRED_VALID";
  return status === "OPEN" ? "VALID_INTERNAL" : "EXPIRED_VALID";
}

function cleanTitle(theme: string, gallery: string) {
  const withoutRange = theme.replace(/\s*\(\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}\)\s*$/, "").trim();
  const englishLead = withoutRange.match(/^([A-Z0-9][^.]{8,120}?)\s+The\s+/);
  if (englishLead) return englishLead[1].trim();
  if (withoutRange) return withoutRange.slice(0, 180);
  return gallery.slice(0, 180);
}

function organizerFromText(text: string) {
  const labeledOrganizer = labeled(text, "주관");
  if (labeledOrganizer) return labeledOrganizer.replace(/\s+/g, " ").slice(0, 160);
  const english = text.match(/\bThe\s+((?:[A-Z][A-Za-z'’.-]+\s+){1,8}Organization)\b/);
  return english?.[1]?.trim() || null;
}

function organizerTypeOf(name: string | null): OrganizerType | null {
  if (!name) return null;
  if (/뮤지엄|미술관|museum/i.test(name)) return "MUSEUM";
  if (/갤러리|gallery/i.test(name)) return "GALLERY";
  if (/청$|시청|도청|구청/.test(name)) return "GOVERNMENT";
  if (/센터|신탁|\(주\)|재단|협회|organization/i.test(name)) return "ORGANIZATION";
  return null;
}

function locationFromNotice(statedPlace: string | null, text: string) {
  const place = String(statedPlace || "").trim();
  if (/서울/.test(place)) return { country: "한국", city: "서울", locationText: place };
  const city = place.match(/([가-힣]{2,10}시)/)?.[1] || null;
  if (city) return { country: "한국", city, locationText: place };
  if (/[가-힣]+도/.test(place)) return { country: "한국", city: null, locationText: place };
  if (/sado island/i.test(text)) return { country: "일본", city: null, locationText: "Sado Island" };
  if (/[가-힣]/.test(text) && /주관/.test(text)) return { country: "한국", city: null, locationText: place || null };
  return { country: null, city: null, locationText: place || null };
}

function opportunityType(text: string): OpportunityType | null {
  if (/레지던시|레지던스|artist[- ]in[- ]residence|\bresidency\b/i.test(text)) return "RESIDENCY";
  if (/공동주택|공공미술|미술작품\s*선정/.test(text)) return "PUBLIC_ART";
  if (/아트\s*페어|art\s+fair/i.test(text)) return "FAIR";
  if (/참가비\s*지원|지원사업/.test(text)) return "GRANT";
  if (/공모전/.test(text)) return "PRIZE";
  if (/기획전|전시\s*개요|개인전/.test(text)) return "EXHIBITION";
  if (/대관/.test(text)) return "PROGRAM";
  return null;
}

function feeFacts(fee: string | null) {
  if (!fee) return { feeAmount: null, feeCurrency: null, feeRequired: null };
  if (/무료|없음|^free$/i.test(fee)) return { feeAmount: null, feeCurrency: null, feeRequired: false };
  const amount = fee.match(/([0-9][0-9,]*)/);
  const currency = /원/.test(fee) ? "KRW" : fee.includes("$") ? "USD" : null;
  return {
    feeAmount: amount ? Number(amount[1].replace(/,/g, "")) : null,
    feeCurrency: currency,
    feeRequired: true,
  };
}

function applicationWindow(text: string, storedDeadline: string) {
  const schedule = labeled(text, "접수일정");
  const match = schedule?.match(/(\d{4}-\d{2}-\d{2})\s*[~～-]\s*(\d{4}-\d{2}-\d{2})/);
  if (!match) return { applicationStart: null, deadline: DATE.test(storedDeadline) ? storedDeadline : null };
  return { applicationStart: match[1], deadline: match[2] };
}

function sourceClassOf(url: string, external: boolean): SourceClass | null {
  if (!external) return "INTERNAL";
  if (!url) return null;
  if (isReprintHost(url)) return "REPRINT";
  if (/air-j\.info|resartis|transartists|callforentry/i.test(url)) return "DIRECTORY";
  return "DIRECT";
}

function sourceLanguage(text: string) {
  const hangul = (text.match(/[가-힣]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (hangul === 0 && latin === 0) return null;
  return hangul >= latin ? "ko" : "en";
}

function disciplinesOf(text: string) {
  const found = ["불화", "민화", "회화", "조각", "사진", "설치"].filter((item) => text.includes(item));
  return found.length ? found.join(", ") : null;
}

export function draftOpportunity(call: LegacyOpenCallInput, now = new Date()): OpportunityDraft | null {
  const classification = classifyOpenCall(call, now);
  if (classification === "SYNTHETIC_SEED" || classification === "TEST_OR_DEMO" || classification === "INVALID" || classification === "UNKNOWN") {
    return null;
  }
  const text = `${call.theme || ""}\n${call.galleryDescription || ""}`;
  const facts = listingFacts(call);
  const title = cleanTitle(String(call.theme || ""), String(call.gallery || ""));
  const organizerName = organizerFromText(text);
  const officialUrl = facts.officialApplicationUrl;
  const sourceUrl = String(call.externalUrl || "").trim() || null;
  const window = applicationWindow(text, String(call.deadline || "").trim());
  const place = locationFromNotice(facts.statedPlace, text);
  const fee = feeFacts(facts.fee);
  const sourceClass = sourceClassOf(sourceUrl || "", Boolean(call.isExternal));
  const verificationStatus: VerificationStatus = organizerName && (sourceClass === "REPRINT" || sourceClass === "DIRECTORY")
    ? "VERIFIED_AGGREGATOR"
    : sourceClass === "DIRECT" && officialUrl && hostOf(officialUrl) === hostOf(sourceUrl)
      ? "VERIFIED_OFFICIAL"
      : sourceClass === "INTERNAL" && organizerName
        ? "REVIEW_REQUIRED"
        : "REVIEW_REQUIRED";
  const deadline = window.deadline;
  const discoveredAt = call.createdAt ? new Date(call.createdAt) : null;
  return {
    classification,
    type: opportunityType(text),
    title,
    organizerName,
    organizerType: organizerTypeOf(organizerName),
    country: place.country,
    city: place.city,
    locationText: place.locationText,
    deadline,
    deadlineTimezone: null,
    applicationStart: window.applicationStart,
    eventStart: null,
    eventEnd: null,
    ...fee,
    eligibility: facts.eligibility,
    disciplines: disciplinesOf(text),
    internationalEligible: /국적\s*무관|artists of all nationalit/i.test(text) ? true : null,
    description: String(call.galleryDescription || "").trim().slice(0, 1000) || null,
    officialUrl,
    sourceUrl,
    sourceHost: hostOf(sourceUrl) || null,
    sourceLanguage: sourceLanguage(text),
    sourceClass,
    status: deadlineStatus(deadline, now),
    verificationStatus,
    fingerprint: opportunityFingerprint({
      organizerName,
      title,
      deadline,
      officialUrl,
      sourceUrl,
    }),
    cycleKey: opportunityCycleKey({ organizerName, title, deadline }),
    legacyOpenCallId: call.id,
    discoveredAt: discoveredAt && !Number.isNaN(discoveredAt.getTime()) ? discoveredAt : null,
  };
}
