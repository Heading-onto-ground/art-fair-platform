export type VerifiedAlias = {
  slug: string;
  label: string;
  language: "en" | "ko";
  script: "Latn" | "Hang";
  source: string;
};

const REVIEW = "ROB identity review 2026-10-12";

/** Explicitly verified labels. Hyphen and spacing variants are matched by normalization, not by deleting letters. */
export const VERIFIED_ALIASES: readonly VerifiedAlias[] = [
  { slug: "lee-ufan", label: "Lee Ufan", language: "en", script: "Latn", source: REVIEW },
  { slug: "lee-ufan", label: "이우환", language: "ko", script: "Hang", source: REVIEW },
  { slug: "lee-ufan", label: "Lee U-Fan", language: "en", script: "Latn", source: REVIEW },
  { slug: "lee-ufan", label: "Lee U Fan", language: "en", script: "Latn", source: REVIEW },
  { slug: "park-seo-bo", label: "Park Seo-Bo", language: "en", script: "Latn", source: REVIEW },
  { slug: "park-seo-bo", label: "박서보", language: "ko", script: "Hang", source: REVIEW },
  { slug: "park-seo-bo", label: "Park Seo Bo", language: "en", script: "Latn", source: REVIEW },
  { slug: "park-seo-bo", label: "Park Seobo", language: "en", script: "Latn", source: REVIEW },
  { slug: "ha-chong-hyun", label: "Ha Chong-Hyun", language: "en", script: "Latn", source: REVIEW },
  { slug: "ha-chong-hyun", label: "하종현", language: "ko", script: "Hang", source: REVIEW },
  { slug: "ha-chong-hyun", label: "Ha Chong Hyun", language: "en", script: "Latn", source: REVIEW },
  { slug: "ha-chong-hyun", label: "Ha Chonghyun", language: "en", script: "Latn", source: REVIEW },
  { slug: "chung-sang-hwa", label: "Chung Sang-Hwa", language: "en", script: "Latn", source: REVIEW },
  { slug: "chung-sang-hwa", label: "정상화", language: "ko", script: "Hang", source: REVIEW },
  { slug: "chung-sang-hwa", label: "Chung Sang Hwa", language: "en", script: "Latn", source: REVIEW },
  { slug: "chung-sang-hwa", label: "Chung Sanghwa", language: "en", script: "Latn", source: REVIEW },
  { slug: "yun-hyong-keun", label: "Yun Hyong-keun", language: "en", script: "Latn", source: "PKM Gallery estate page" },
  { slug: "yun-hyong-keun", label: "윤형근", language: "ko", script: "Hang", source: "PKM Gallery estate page" },
  { slug: "yun-hyong-keun", label: "Yun Hyong-Keun", language: "en", script: "Latn", source: "Park Seo-Bo Foundation biography" },
  { slug: "yun-hyong-keun", label: "Yun Hyongkeun", language: "en", script: "Latn", source: "Ingong Gallery 1992 exhibition title already in ROB" },
  { slug: "kim-tschang-yeul", label: "Kim Tschang-Yeul", language: "en", script: "Latn", source: "PYO Gallery artist page" },
  { slug: "kim-tschang-yeul", label: "김창열", language: "ko", script: "Hang", source: "PYO Gallery artist page" },
  { slug: "kim-tschang-yeul", label: "Kim Tschangyeul", language: "en", script: "Latn", source: "PYO Gallery heading" },
  { slug: "chung-chang-sup", label: "Chung Chang-Sup", language: "en", script: "Latn", source: "Tina Kim Gallery, When Process Becomes Form, 2016" },
  { slug: "chung-chang-sup", label: "Chung Chang-Sub", language: "en", script: "Latn", source: "Encyves Wiki English name Chung Chang-sub for 정창섭, 1927-2011" },
  { slug: "chung-chang-sup", label: "정창섭", language: "ko", script: "Hang", source: "Encyves Wiki representative name for Chung Chang-sub, 1927-2011" },
  { slug: "kim-guiline", label: "Kim Guiline", language: "en", script: "Latn", source: "Kukje Gallery, The Art of Dansaekhwa, 2014" },
  { slug: "kim-guiline", label: "김기린", language: "ko", script: "Hang", source: "Kukje Gallery Korean exhibition text, The Art of Dansaekhwa, 2014" },
  { slug: "kim-guiline", label: "Kim Gui-line", language: "en", script: "Latn", source: "Seoul Museum of Art collection page, Kim Gui-line, born 1936" },
  { slug: "kim-whanki", label: "Kim Whanki", language: "en", script: "Latn", source: "Tina Kim Gallery, When Process Becomes Form, 2016" },
  { slug: "kim-whanki", label: "김환기", language: "ko", script: "Hang", source: "Monthly Art, After Drawing, June 2016, paired with the Korea JoongAng Daily English listing of Kim Whanki in that exhibition" },
  { slug: "kwon-young-woo", label: "Kwon Young-Woo", language: "en", script: "Latn", source: "Tina Kim Gallery, When Process Becomes Form, 2016" },
  { slug: "kwon-young-woo", label: "권영우", language: "ko", script: "Hang", source: "Kukje Gallery news, Landlord Colors, https://www.kukjegallery.com/news/view?seq=762" },
  { slug: "youn-myeungro", label: "Youn Myeungro", language: "en", script: "Latn", source: "National Academy of Arts member page, memb_id=359" },
  { slug: "youn-myeungro", label: "윤명로", language: "ko", script: "Hang", source: "National Academy of Arts member page, memb_id=359" },
  { slug: "kim-hyung-dae", label: "Kim Hyung Dae", language: "en", script: "Latn", source: "National Academy of Arts member page, memb_id=537" },
  { slug: "kim-hyung-dae", label: "김형대", language: "ko", script: "Hang", source: "National Academy of Arts member page, memb_id=537" },
];

/** Letter-author names in an exhibition title are not participants of that exhibition. */
export function mayRelinkUnresolvedName(exhibitionTitle: string): boolean {
  return !/letters of/i.test(exhibitionTitle);
}

/** A name that only appears inside the exhibition title is not relinked from that title. */
export function labelAppearsInTitle(label: string, exhibitionTitle: string): boolean {
  const fold = (value: string) =>
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212-]/g, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const name = fold(label);
  const title = fold(exhibitionTitle);
  if (!name || !title) return false;
  return ` ${title} `.includes(` ${name} `);
}

export function shouldRelinkUnresolved(label: string, exhibitionTitle: string, status = "UNRESOLVED_PARTICIPANT"): boolean {
  if (status !== "UNRESOLVED_PARTICIPANT") return false;
  if (!mayRelinkUnresolvedName(exhibitionTitle)) return false;
  return !labelAppearsInTitle(label, exhibitionTitle);
}

export type ParticipantEvidence = "EXPLICIT_PARTICIPANT" | "TITLE_ONLY" | "AMBIGUOUS" | "NOT_PARTICIPANT";

/** Internal candidate state. A title, essay title, caption heading, or headline is not a participant list. */
export function participantEvidence(input: {
  listedAsParticipant: boolean;
  namedInTitle: boolean;
  ambiguous?: boolean;
}): ParticipantEvidence {
  if (input.listedAsParticipant) return "EXPLICIT_PARTICIPANT";
  if (input.namedInTitle) return "TITLE_ONLY";
  if (input.ambiguous) return "AMBIGUOUS";
  return "NOT_PARTICIPANT";
}

export function mayCreateParticipation(evidence: ParticipantEvidence): boolean {
  return evidence === "EXPLICIT_PARTICIPANT";
}

export function normalizeArtistLookup(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function aliasLookupEqual(left: string, right: string): boolean {
  const a = normalizeArtistLookup(left);
  const b = normalizeArtistLookup(right);
  return a.length > 0 && a === b;
}

export function aliasLookupPrefix(query: string, name: string): boolean {
  const q = normalizeArtistLookup(query);
  const n = normalizeArtistLookup(name);
  return q.length > 0 && n.startsWith(q);
}

export function resolveVerifiedAlias(label: string): string | null {
  const hit = VERIFIED_ALIASES.find((alias) => aliasLookupEqual(alias.label, label));
  return hit?.slug ?? null;
}

export function resolveArtistSlug(label: string, names: { slug: string; labels: string[] }[]): string | null {
  const verified = resolveVerifiedAlias(label);
  if (verified && names.some((artist) => artist.slug === verified)) return verified;
  const hit = names.find((artist) => artist.labels.some((name) => aliasLookupEqual(name, label)));
  return hit?.slug ?? null;
}

/** URL slug for an alias label. Hangul-only labels do not become a latin slug. */
export function aliasUrlSlug(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Canonical slug when the requested URL slug is a verified alias and not already canonical.
 * "lee-u-fan" resolves to "lee-ufan". "lee-ufan" and "lee-fan" do not redirect.
 */
export function aliasSlugRedirect(slug: string): string | null {
  const requested = slug.normalize("NFKC").trim().toLowerCase();
  if (!requested) return null;
  for (const alias of VERIFIED_ALIASES) {
    const aliasSlug = aliasUrlSlug(alias.label);
    if (!aliasSlug) continue;
    if (aliasSlug === requested && alias.slug !== requested) return alias.slug;
  }
  return null;
}

/** Privacy-safe missing-search key. Email-shaped queries are dropped. */
export function searchDemandQuery(value: string): string | null {
  const normalized = normalizeArtistLookup(value);
  if (normalized.length < 3 || normalized.length > 80) return null;
  if (normalized.includes("@")) return null;
  return normalized;
}
