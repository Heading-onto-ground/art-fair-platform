import type { MetadataRoute } from "next";
import { LOCALE_URLS } from "@/lib/history/localeUrl";
import { SITE_URL } from "@/lib/seo";
import { PROTECTED_PREFIXES, NOINDEX_PATHS } from "@/lib/routes";

// Google matches a robots path as a prefix. `/exhibitions/new` therefore also
// matches the public exhibition `/exhibitions/new-works-2025`. An exact rule
// plus a trailing-slash child rule keeps the private route blocked without
// swallowing a public slug that merely continues the same letters.
export function crawlerDisallow(path: string): string[] {
  if (path.endsWith("/")) return [path];
  return [`${path}$`, `${path}/`];
}

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [...NOINDEX_PATHS, ...PROTECTED_PREFIXES];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep auth-gated, account, and machine routes out of the index.
        // Shared with middleware.ts via lib/routes.ts so the lists never drift.
        disallow: [
          ...privatePaths.flatMap(crawlerDisallow),
          ...LOCALE_URLS.flatMap((locale) =>
            privatePaths.flatMap((path) => crawlerDisallow(`/${locale}${path}`)),
          ),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
