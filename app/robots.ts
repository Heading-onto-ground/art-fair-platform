import type { MetadataRoute } from "next";
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
        disallow: [...NOINDEX_PATHS, ...PROTECTED_PREFIXES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
