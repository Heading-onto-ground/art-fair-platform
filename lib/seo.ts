import type { Metadata } from "next";
import type { HistoryLocale } from "@/lib/history/locale";
import { withLocalePrefix } from "@/lib/history/localeUrl";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com"
).replace(/\/$/, "");

export const SITE_NAME = "ROB — Role of Bridge";
export const CANONICAL_HOST = "rob-roleofbridge.com";

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function languageAlternates(path: string, localeUrl: HistoryLocale | null) {
  const bare = path.startsWith("/") ? path : `/${path}`;
  const canonicalPath = localeUrl ? withLocalePrefix(bare, localeUrl) : bare;
  return {
    canonical: absoluteUrl(canonicalPath),
    languages: {
      ko: absoluteUrl(withLocalePrefix(bare, "ko")),
      en: absoluteUrl(withLocalePrefix(bare, "en")),
      "x-default": absoluteUrl(bare),
    },
  };
}

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
  localeUrl?: HistoryLocale | null;
}): Metadata {
  const description = clamp(input.description);
  const alternates = languageAlternates(input.path, input.localeUrl ?? null);
  const url = alternates.canonical;
  // Data-URI images (base64) are not valid OG images; only pass real URLs.
  const image =
    input.image && /^https?:\/\//.test(input.image) ? input.image : undefined;
  const images = image ? [{ url: image }] : undefined;

  return {
    // Titles passed here already end with "| ROB"; bypass the root layout's
    // "%s | ROB" template to avoid a doubled suffix.
    title: { absolute: input.title },
    description,
    alternates,
    robots: input.index === false ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: input.type || "website",
      url,
      title: input.title,
      description,
      siteName: SITE_NAME,
      locale: input.localeUrl === "ko" ? "ko_KR" : "en_US",
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
