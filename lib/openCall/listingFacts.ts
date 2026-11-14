export type OpportunityKind = "공모전" | "레지던시" | "대관전" | "기획전" | "판매 행사";

export type ListingFactsInput = {
  city?: string | null;
  theme?: string | null;
  galleryDescription?: string | null;
  externalUrl?: string | null;
  galleryWebsite?: string | null;
  externalEmail?: string | null;
};

export type ListingFacts = {
  sourceRole: "reprint" | "direct";
  organizerUrl: string | null;
  organizerEmail: string | null;
  statedPlace: string | null;
  cityNeedsCheck: boolean;
  kind: OpportunityKind | null;
  fee: string | null;
  support: string | null;
  eligibility: string | null;
  canEmailOrganizer: boolean;
  websiteIsFeed: boolean;
  officialApplicationUrl: string | null;
};

export const FEE_UNKNOWN = "참가비 확인 필요";
export const ELIGIBILITY_UNKNOWN = "지원 자격 확인 필요";
export const TYPE_UNKNOWN = "유형 확인 필요";

const FEED_PUBLISHER_EMAILS = new Set(["editor@k-artblog.kr"]);
const REPRINT_HOSTS = ["blog.naver.com", "m.blog.naver.com", "rss.blog.naver.com"];

function hostOf(url?: string | null) {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isReprintHost(url?: string | null) {
  const host = hostOf(url);
  return REPRINT_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
}

function bodyText(input: ListingFactsInput) {
  return `${input.theme || ""}\n${input.galleryDescription || ""}`;
}

function labeled(text: string, label: string) {
  const match = text.match(new RegExp(
    `${label}\\s*[▶:>：]\\s*([\\s\\S]*?)(?=\\s*(?:접수일정|주관|주소|연락처|이메일|홈페이지|참가비|지원\\s*자격|응모\\s*자격|참가\\s*자격)\\s*[▶:>：]|$)`,
    "i",
  ));
  return match?.[1]?.trim() || null;
}

function detectKind(text: string): OpportunityKind | null {
  if (/레지던시|레지던스|artist[- ]in[- ]residence|\bresidency\b/i.test(text)) return "레지던시";
  if (/대관/.test(text)) return "대관전";
  if (/아트\s*페어|art\s+fair|작품\s*판매/i.test(text)) return "판매 행사";
  if (/공모전/.test(text)) return "공모전";
  if (/기획전/.test(text)) return "기획전";
  return null;
}

function detectFee(text: string) {
  const match = text.match(/(?:참가비|접수비|entry fee)\s*[▶:>：]?\s*(무료|없음|없\s*음|[0-9][0-9,]*\s*원|free|\$[0-9][0-9,]*)/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, "");
}

function detectEligibility(text: string) {
  const match = text.match(/(?:지원\s*자격|응모\s*자격|참가\s*자격|eligibility)\s*[▶:>：]\s*([^▶\n]{2,80})/i);
  return match?.[1]?.trim() || null;
}

function detectSupport(text: string) {
  const match = text.match(/(지원금|상금|체재비|숙소|숙박|stipend|accommodation)(?:\s*(?:제공|있음|included))?/i);
  if (!match) return null;
  const start = Math.max(0, (match.index ?? 0) - 12);
  return text.slice(start, (match.index ?? 0) + match[0].length).replace(/\s+/g, " ").trim();
}

function placeConflicts(city: string, place: string) {
  const cityKey = city.toLowerCase().replace(/\s+/g, "");
  const placeKey = place.toLowerCase().replace(/\s+/g, "");
  if (!cityKey || !placeKey) return false;
  if (cityKey === "seoul" || cityKey === "서울") return !/서울|seoul/i.test(place);
  return !placeKey.includes(cityKey);
}

export function listingFacts(input: ListingFactsInput): ListingFacts {
  const text = bodyText(input);
  const organizerUrl = labeled(text, "홈페이지")?.match(/https?:\/\/\S+/i)?.[0]?.replace(/[),.;]+$/, "") || null;
  const organizerEmail = labeled(text, "이메일")?.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0]?.replace(/[),.;]+$/, "") || null;
  const statedPlace = labeled(text, "주소");
  const eligibility = detectEligibility(text);
  const city = String(input.city || "").trim();
  const storedEmail = String(input.externalEmail || "").trim().toLowerCase();
  const reprint = isReprintHost(input.externalUrl) || isReprintHost(input.galleryWebsite);
  const publisherEmail = FEED_PUBLISHER_EMAILS.has(storedEmail);
  const emailMatchesOrganizer = !!organizerEmail && organizerEmail.toLowerCase() === storedEmail;
  const canEmailOrganizer = !!storedEmail
    && !publisherEmail
    && !reprint
    && emailMatchesOrganizer;
  const cityConfirmed = !!statedPlace && !placeConflicts(city, statedPlace);
  const cityNeedsCheck = !!city && !cityConfirmed && (reprint || (!!statedPlace && placeConflicts(city, statedPlace)));

  return {
    sourceRole: reprint ? "reprint" : "direct",
    organizerUrl,
    organizerEmail,
    statedPlace,
    cityNeedsCheck,
    kind: detectKind(text),
    fee: detectFee(text),
    support: detectSupport(text),
    eligibility,
    canEmailOrganizer,
    websiteIsFeed: isReprintHost(input.galleryWebsite),
    officialApplicationUrl: organizerUrl && !isReprintHost(organizerUrl) ? organizerUrl : null,
  };
}

export function feeDisplay(fee: string | null) {
  return fee || FEE_UNKNOWN;
}

export function eligibilityDisplay(eligibility: string | null) {
  return eligibility || ELIGIBILITY_UNKNOWN;
}

export function typeDisplay(kind: OpportunityKind | null) {
  return kind || TYPE_UNKNOWN;
}

export function locationLine(facts: ListingFacts, storedCity: string) {
  if (facts.cityNeedsCheck && facts.statedPlace) {
    return { text: facts.statedPlace, usesStoredCity: false as const };
  }
  if (facts.cityNeedsCheck) {
    return { text: "위치 확인 필요", usesStoredCity: false as const };
  }
  return { text: storedCity, usesStoredCity: true as const };
}
