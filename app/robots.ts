import type { MetadataRoute } from "next";
import { LOCALE_URLS } from "@/lib/history/localeUrl";
import { SITE_URL } from "@/lib/seo";
import { PROTECTED_PREFIXES, NOINDEX_PATHS } from "@/lib/routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep auth-gated, account, and machine routes out of the index.
        // Shared with middleware.ts via lib/routes.ts so the lists never drift.
        disallow: [
          ...NOINDEX_PATHS,
          ...PROTECTED_PREFIXES,
          ...LOCALE_URLS.flatMap((locale) =>
            [...NOINDEX_PATHS, ...PROTECTED_PREFIXES].map((path) => `/${locale}${path}`),
          ),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
