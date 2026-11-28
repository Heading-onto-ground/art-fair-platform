import type { MetadataRoute } from "next";
import { LOCALE_URLS } from "@/lib/history/localeUrl";
import { SITE_URL } from "@/lib/seo";
import { PROTECTED_PREFIXES, NOINDEX_PATHS } from "@/lib/routes";

const EDITOR_PATH = "/exhibitions/new";

// Google matches a robots path as a prefix, and the match includes the query
// string. `/exhibitions/new` therefore also matches the public exhibition
// `/exhibitions/new-works-2025`. Only that colliding path uses an exact rule,
// a child-path rule, and a query-string rule. `$` means the end of the URL, so
// it does not cover `/exhibitions/new?draft=1`. Every other private path keeps
// the prefix rule, which still blocks `/login?redirect=...`.
export function crawlerDisallow(path: string): string[] {
  if (path === EDITOR_PATH || path.endsWith(EDITOR_PATH)) {
    return [`${path}$`, `${path}/`, `${path}?`];
  }
  return [path];
}

export function robotsRuleMatches(rule: string, urlPath: string): boolean {
  const path = urlPath.split("#")[0];
  if (rule.endsWith("$")) return path === rule.slice(0, -1);
  return path.startsWith(rule);
}

export function googleRobotsBlocks(urlPath: string, disallow: readonly string[], allow: readonly string[] = ["/"]): boolean {
  const matched = [
    ...allow.filter((rule) => robotsRuleMatches(rule, urlPath)).map((rule) => ({ rule, allowed: true })),
    ...disallow.filter((rule) => robotsRuleMatches(rule, urlPath)).map((rule) => ({ rule, allowed: false })),
  ];
  if (matched.length === 0) return false;
  const specificity = (rule: string) => rule.length;
  const longest = Math.max(...matched.map((item) => specificity(item.rule)));
  const winners = matched.filter((item) => specificity(item.rule) === longest);
  return winners.every((item) => !item.allowed);
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
