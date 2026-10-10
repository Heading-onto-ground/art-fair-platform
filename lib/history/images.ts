import { isFirstPartyImage } from "@/lib/history/policy";

/**
 * Rights-aware stills for history pages.
 * Gallery pages are not crawled. An image with unknown rights does not render.
 * Open-license sources (Wikimedia Commons, museum open-access) can be stored
 * later with creator, license, license URL, source URL, and attribution.
 */
export const IMAGE_PROVENANCE = ["FIRST_PARTY", "OPEN_LICENSE", "PERMISSION_GRANTED"] as const;

export type ImageProvenance = (typeof IMAGE_PROVENANCE)[number];

export type HistoryImage = {
  url: string;
  alt: string;
  provenance: ImageProvenance;
  creator: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  attribution: string | null;
};

export type FirstPartyWorkCandidate = {
  id: string;
  isPublic: boolean;
  imageUrl: string | null;
  title?: string | null;
};

function httpsUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function publicHistoryImage(image: HistoryImage | null | undefined): HistoryImage | null {
  if (!image?.url || !IMAGE_PROVENANCE.includes(image.provenance)) return null;
  if (image.provenance === "FIRST_PARTY") {
    if (!isFirstPartyImage(image.url)) return null;
    return image;
  }
  if (!httpsUrl(image.url) || !httpsUrl(image.sourceUrl) || !image.attribution?.trim()) return null;
  if (image.provenance === "OPEN_LICENSE") {
    if (!image.license?.trim() || !httpsUrl(image.licenseUrl) || !image.creator?.trim()) return null;
  }
  return image;
}

/**
 * A public artist upload can become the history hero only when that work is
 * explicitly selected. The newest public work is not chosen automatically,
 * and a private work is never eligible.
 */
export function selectExplicitFirstPartyHero(
  works: FirstPartyWorkCandidate[],
  explicitWorkId: string | null | undefined,
): HistoryImage | null {
  if (!explicitWorkId) return null;
  const work = works.find((item) => item.id === explicitWorkId);
  if (!work?.isPublic || !work.imageUrl || !isFirstPartyImage(work.imageUrl)) return null;
  const title = work.title?.trim();
  return publicHistoryImage({
    url: work.imageUrl,
    alt: title || "Artwork uploaded by the artist",
    provenance: "FIRST_PARTY",
    creator: null,
    license: null,
    licenseUrl: null,
    sourceUrl: null,
    attribution: "Artist upload",
  });
}
