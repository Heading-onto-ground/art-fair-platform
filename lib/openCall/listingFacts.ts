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
  organizerName: string | null;
  organizerUrl: string | null;
  organizerEmail: string | null;
  statedPlace: string | null;
  cityNeedsCheck: boolean;
  kind: OpportunityKind | null;
  fee: string | null;
  participationFee: string | null;
  shippingCost: string | null;
  salesCommission: string | null;
  otherBurden: string | null;
  support: string | null;
  eligibility: string | null;
  canEmailOrganizer: boolean;
  websiteIsFeed: boolean;
  officialApplicationUrl: string | null;
};

export const FEE_UNKNOWN = "지원비 미확인";
export const ELIGIBILITY_UNKNOWN = "지원 자격 미확인";
export const TYPE_UNKNOWN = "유형 미확인";

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
    `${label}\\s*[▶:>：]\\s*([\\s\\S]*?)(?=\\s*(?:접수일정|주관|주최|주소|연락처|이메일|홈페이지|참가비|접수비|지원비|지원\\s*자격|응모\\s*자격|참가\\s*자격|운송비|설치비|판매\\s*수수료)\\s*[▶:>：]|$)`,
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

const MONEY = "(무료|없음|없\\s*음|[0-9][0-9,]*\\s*원|[0-9]{1,2}\\s*%|free|\\$[0-9][0-9,]*)";

function cleanMoney(value: string) {
  return value.replace(/\s+/g, "");
}

function detectFee(text: string) {
  const re = new RegExp(`(?:참가비|접수비|응모비|지원비|entry fee|application fee)\\s*[▶:>：]?\\s*${MONEY}`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const before = text.slice(Math.max(0, match.index - 10), match.index);
    if (/선정\s*후\s*$/.test(before) || /전시\s*$/.test(before)) continue;
    return cleanMoney(match[1]);
  }
  return null;
}

function detectLabeledCost(text: string, labels: string) {
  const match = text.match(new RegExp(`(?:${labels})\\s*[▶:>：]?\\s*${MONEY}`, "i"));
  return match ? cleanMoney(match[1]) : null;
}

function detectArtistPays(text: string, labels: string) {
  const match = text.match(new RegExp(`(?:${labels})(?:\\s*[▶:>：])?[^\\n▶]{0,24}(작가\\s*부담|본인\\s*부담)`, "i"));
  return match ? "작가 부담" : null;
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
  const organizerName = cleanOrganizer(labeled(text, "주관") || labeled(text, "주최") || labeled(text, "organizer"));
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
    organizerName,
    organizerUrl,
    organizerEmail,
    statedPlace,
    cityNeedsCheck,
    kind: detectKind(text),
    fee: detectFee(text),
    participationFee: detectLabeledCost(text, "선정\\s*후\\s*참가비|전시\\s*참가비|participation fee"),
    shippingCost: detectLabeledCost(text, "운송\\s*·?\\s*설치\\s*비용|운송비|설치비|배송비") || detectArtistPays(text, "운송\\s*·?\\s*설치\\s*비용|운송비|설치비|배송비"),
    salesCommission: detectLabeledCost(text, "판매\\s*수수료|판매\\s*커미션|commission"),
    otherBurden: detectLabeledCost(text, "기타\\s*비용|기타\\s*부담|재료비") || detectArtistPays(text, "기타\\s*비용|기타\\s*부담|재료비"),
    support: detectSupport(text),
    eligibility,
    canEmailOrganizer,
    websiteIsFeed: isReprintHost(input.galleryWebsite),
    officialApplicationUrl: organizerUrl && !isReprintHost(organizerUrl) ? organizerUrl : null,
  };
}

function cleanOrganizer(value: string | null) {
  if (!value) return null;
  const name = value.replace(/\s+/g, " ").replace(/[|,.;]+$/, "").trim();
  if (name.length < 2 || /@|https?:/i.test(name)) return null;
  return name.slice(0, 80);
}

export function feeDisplay(fee: string | null) {
  if (!fee) return FEE_UNKNOWN;
  if (/^(무료|없음|free)$/i.test(fee)) return "지원비 없음";
  return `지원비 ${fee}`;
}

export type CostKey = "application" | "participation" | "shipping" | "commission" | "other";

export type CostLine = {
  key: CostKey;
  label: string;
  value: string;
  known: boolean;
};

const COST_LABELS: Record<CostKey, { ko: string; en: string }> = {
  application: { ko: "지원비", en: "Application fee" },
  participation: { ko: "선정 후 참가비", en: "Fee after selection" },
  shipping: { ko: "운송·설치", en: "Shipping and install" },
  commission: { ko: "판매 수수료", en: "Sales commission" },
  other: { ko: "기타 부담", en: "Other confirmed cost" },
};

function displayBurden(raw: string | null, lang: string) {
  const ko = lang === "ko";
  if (!raw) return { known: false, value: ko ? "미확인" : "Unconfirmed" };
  if (/^(무료|없음|free)$/i.test(raw)) return { known: true, value: ko ? "없음" : "None" };
  if (raw === "작가 부담") return { known: true, value: ko ? "작가 부담" : "Artist pays" };
  return { known: true, value: raw };
}

export function costLines(facts: ListingFacts, lang = "ko"): CostLine[] {
  const rows: Array<[CostKey, string | null]> = [
    ["application", facts.fee],
    ["participation", facts.participationFee],
    ["shipping", facts.shippingCost],
    ["commission", facts.salesCommission],
    ["other", facts.otherBurden],
  ];
  return rows.map(([key, raw]) => {
    const shown = displayBurden(raw, lang);
    return { key, label: lang === "ko" ? COST_LABELS[key].ko : COST_LABELS[key].en, ...shown };
  });
}

export function costSummary(facts: ListingFacts, lang = "ko") {
  const ko = lang === "ko";
  const [application, ...rest] = costLines(facts, lang);
  const othersKnown = rest.some((line) => line.known);
  if (!application.known) return ko ? "지원비 미확인" : "Application fee unconfirmed";
  const fee = application.value === (ko ? "없음" : "None")
    ? (ko ? "지원비 없음" : "No application fee")
    : (ko ? `지원비 ${application.value}` : `Application fee ${application.value}`);
  if (othersKnown) {
    const extra = rest.filter((line) => line.known).map((line) => `${line.label} ${line.value}`).join(ko ? " · " : "; ");
    return `${fee}${ko ? " · " : "; "}${extra}`;
  }
  return ko ? `${fee} · 그 외 미확인` : `${fee}; other costs unconfirmed`;
}

export function organizerDisplay(name: string | null, lang = "ko") {
  if (name) return name;
  return lang === "ko" ? "주최 미확인" : "Organizer unconfirmed";
}

export function applicationRouteLabel(isExternal: boolean | undefined, lang = "ko") {
  if (isExternal) return lang === "ko" ? "외부 사이트에서 접수" : "Apply on an external site";
  return lang === "ko" ? "ROB에서 접수" : "Apply on ROB";
}

export function deadlineStatus(deadline: string, now = new Date()): "open" | "closed" | "unknown" {
  const day = String(deadline || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "unknown";
  const end = new Date(`${day}T23:59:59+09:00`);
  if (Number.isNaN(end.getTime())) return "unknown";
  return now.getTime() <= end.getTime() ? "open" : "closed";
}

export type ApplyDestination = { href: string; kind: "official" | "notice" | "source" };

export function applyDestination(facts: ListingFacts, externalUrl?: string | null): ApplyDestination | null {
  if (facts.officialApplicationUrl) return { href: facts.officialApplicationUrl, kind: "official" };
  if (facts.organizerUrl) return { href: facts.organizerUrl, kind: "notice" };
  const source = String(externalUrl || "").trim();
  if (source) return { href: source, kind: "source" };
  return null;
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
