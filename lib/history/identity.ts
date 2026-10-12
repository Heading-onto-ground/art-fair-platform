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
  { slug: "kim-whanki", label: "Kim Whanki", language: "en", script: "Latn", source: "Tina Kim Gallery, When Process Becomes Form, 2016" },
  { slug: "kwon-young-woo", label: "Kwon Young-Woo", language: "en", script: "Latn", source: "Tina Kim Gallery, When Process Becomes Form, 2016" },
];

/** Letter-author names in an exhibition title are not participants of that exhibition. */
export function mayRelinkUnresolvedName(exhibitionTitle: string): boolean {
  return !/letters of/i.test(exhibitionTitle);
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
