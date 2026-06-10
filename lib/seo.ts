import type { Metadata } from "next";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com"
).replace(/\/$/, "");

export const SITE_NAME = "ROB — Role of Bridge";

function clamp(text: string | null | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Builds page-level Metadata (title, description, canonical, Open Graph, Twitter)
 * for a public entity page. Used from per-segment `layout.tsx` files so the
 * existing interactive client pages stay untouched while crawlers still get
 * server-rendered head tags.
 */
export function pageMetadata(input: {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  index?: boolean;
}): Metadata {
  const description = clamp(input.description);
  const url = `${SITE_URL}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  // Data-URI images (base64) are not valid OG images; only pass real URLs.
  const image =
    input.image && /^https?:\/\//.test(input.image) ? input.image : undefined;
  const images = image ? [{ url: image }] : undefined;

  return {
    title: input.title,
    description,
    alternates: { canonical: url },
    robots: input.index === false ? { index: false, follow: true } : undefined,
    openGraph: {
      type: input.type || "website",
      url,
      title: input.title,
      description,
      siteName: SITE_NAME,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
