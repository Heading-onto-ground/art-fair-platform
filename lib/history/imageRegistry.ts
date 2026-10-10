import { publicHistoryImage, type HistoryImage, type ImageProvenance } from "@/lib/history/images";

/**
 * First rights-checked stills. Presence in this list is not publication.
 * A hero renders only with an allowed provenance, a clear secondary-rights
 * check, and APPROVED. Moment covers stay unpublished.
 */

export const IMAGE_PURPOSES = ["ARTIST_HERO", "MOMENT_COVER"] as const;
export type ImagePurpose = (typeof IMAGE_PURPOSES)[number];

export const SECONDARY_RIGHTS = ["CLEAR", "REVIEW_REQUIRED", "BLOCKED"] as const;
export type SecondaryRightsStatus = (typeof SECONDARY_RIGHTS)[number];

export const PUBLICATION_STATUSES = ["APPROVED", "HOLD"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export type HistoryImageAsset = {
  artistSlug: string;
  purpose: ImagePurpose;
  assetUrl: string;
  sourcePageUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  provenance: ImageProvenance;
  secondaryRightsStatus: SecondaryRightsStatus;
  publicationStatus: PublicationStatus;
  attribution: string;
  alt: string;
  /** full-frame keeps the source composition. Any other value is an applied crop. */
  framing: "full-frame";
  pixelWidth: number;
  pixelHeight: number;
};

export const HISTORY_IMAGE_REGISTRY: HistoryImageAsset[] = [
  {
    artistSlug: "lee-ufan",
    purpose: "ARTIST_HERO",
    assetUrl: "https://upload.wikimedia.org/wikipedia/commons/2/25/Lee_Ufan.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Lee_Ufan.jpg",
    author: "Andrew Tupalev",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    provenance: "OPEN_LICENSE",
    secondaryRightsStatus: "CLEAR",
    publicationStatus: "APPROVED",
    attribution: "Photo: Andrew Tupalev",
    alt: "Portrait of Lee Ufan",
    framing: "full-frame",
    pixelWidth: 1321,
    pixelHeight: 1321,
  },
  {
    // The canvas fills the foreground. The photograph's CC BY-SA license
    // does not by itself clear the artwork shown in the frame.
    artistSlug: "park-seo-bo",
    purpose: "ARTIST_HERO",
    assetUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Park_Seo-Bo_working_at_his_studio_2019.jpg",
    sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Park_Seo-Bo_working_at_his_studio_2019.jpg",
    author: "선의의 바람",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    provenance: "OPEN_LICENSE",
    secondaryRightsStatus: "REVIEW_REQUIRED",
    publicationStatus: "HOLD",
    attribution: "Photo: 선의의 바람",
    alt: "Park Seo-Bo working in the studio, 2019",
    framing: "full-frame",
    pixelWidth: 4912,
    pixelHeight: 7360,
  },
];

const HERO_THUMB_WIDTHS = [330, 500, 960] as const;

/** Wikimedia thumbnail of a Commons original. Returns null for any other host. */
export function commonsHeroRendition(assetUrl: string): { src: string; srcSet: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(assetUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "upload.wikimedia.org") return null;
  const match = parsed.pathname.match(/^\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/i);
  if (!match) return null;
  const [, hash, file] = match;
  const thumb = (width: number) =>
    `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash}/${file}/${width}px-${file}`;
  return {
    src: thumb(500),
    srcSet: HERO_THUMB_WIDTHS.map((width) => `${thumb(width)} ${width}w`).join(", "),
  };
}

export function publishedArtistHero(slug: string): HistoryImage | null {
  const asset = HISTORY_IMAGE_REGISTRY.find((item) => item.artistSlug === slug && item.purpose === "ARTIST_HERO");
  if (!asset || asset.publicationStatus !== "APPROVED" || asset.secondaryRightsStatus !== "CLEAR") return null;
  const image = publicHistoryImage({
    url: asset.assetUrl,
    alt: asset.alt,
    provenance: asset.provenance,
    creator: asset.author,
    license: asset.license,
    licenseUrl: asset.licenseUrl,
    sourceUrl: asset.sourcePageUrl,
    attribution: asset.attribution,
    width: asset.pixelWidth,
    height: asset.pixelHeight,
  });
  if (!image) return null;
  const rendition = commonsHeroRendition(asset.assetUrl);
  if (!rendition) return image;
  return { ...image, url: rendition.src, srcSet: rendition.srcSet };
}
