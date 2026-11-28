import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import robots, { crawlerDisallow, googleRobotsBlocks } from "@/app/robots";
import { aliasSlugRedirect } from "@/lib/history/identity";
import { prefixPublicPath, splitLocalePath, swapLocalePrefix, withLocalePrefix } from "@/lib/history/localeUrl";
import { artistPageDescription, artistPageTitle, schemaDate } from "@/lib/history/seo";
import { publicSitemapEntries } from "@/lib/history/sitemapEntries";
import { artistSitemapEligible, densityForCount, isIndexEligible, spaceIndexEligible } from "@/lib/history/policy";
import { legacyNoindexPath } from "@/lib/routes";
import { CANONICAL_HOST, languageAlternates, pageMetadata, SITE_URL } from "@/lib/seo";
import { siteVerification } from "@/lib/publicGrowth/analytics";

const HOST = "https://rob-roleofbridge.com";

describe("canonical host", () => {
  it("uses the apex https host and never www", () => {
    expect(CANONICAL_HOST).toBe("rob-roleofbridge.com");
    expect(SITE_URL).toBe(HOST);
    expect(SITE_URL.includes("www.")).toBe(false);
    const home = languageAlternates("/", "ko");
    expect(home.canonical).toBe(`${HOST}/ko`);
    expect(home.languages.ko).toBe(`${HOST}/ko`);
    expect(home.languages.en).toBe(`${HOST}/en`);
    expect(home.languages.ja).toBe(`${HOST}/ja`);
    expect(home.languages["zh-Hans"]).toBe(`${HOST}/zh-Hans`);
    expect(home.languages["zh-Hant"]).toBe(`${HOST}/zh-Hant`);
    expect(home.languages["x-default"]).toBe(`${HOST}/`);
    const about = languageAlternates("/ja/about/why-rob", "ja");
    expect(about.canonical).toBe(`${HOST}/about/why-rob`);
    expect(about.languages.ja).toBeUndefined();
    expect(about.languages.ko).toBe(`${HOST}/ko/about/why-rob`);
    expect(about.languages.en).toBe(`${HOST}/en/about/why-rob`);
    const artist = languageAlternates("/artists/haegue-yang", "zh-Hant");
    expect(artist.canonical).toBe(`${HOST}/zh-Hant/artists/haegue-yang`);
    expect(artist.languages.ja).toBe(`${HOST}/ja/artists/haegue-yang`);
    expect(Object.values(home.languages).some((url) => url.includes("www."))).toBe(false);
  });

  it("keeps an unprefixed page canonical on the unprefixed URL", () => {
    const page = pageMetadata({
      title: "ROB — Artist History & Documented Connections",
      description: "Search artists and explore documented exhibitions.",
      path: "/artists/lee-ufan",
    });
    expect(page.alternates?.canonical).toBe(`${HOST}/artists/lee-ufan`);
    expect(page.robots).toEqual({ index: true, follow: true });
  });
});

describe("index policy", () => {
  it("noindexes empty and low-density artists and indexes history-ready records", () => {
    expect(isIndexEligible(densityForCount(0))).toBe(false);
    expect(isIndexEligible(densityForCount(2))).toBe(false);
    expect(artistSitemapEligible(3)).toBe(true);
    expect(artistSitemapEligible(12)).toBe(true);
    expect(spaceIndexEligible(1)).toBe(false);
    expect(spaceIndexEligible(2)).toBe(true);
  });

  it("keeps research pages out of the index", () => {
    const source = readFileSync("app/research/[jobId]/page.tsx", "utf8");
    expect(source).toContain("robots: { index: false, follow: false }");
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules.flatMap((rule) => rule.disallow ?? []) : [];
    expect(disallow).toEqual(expect.arrayContaining(["/research", "/ko/research", "/en/research"]));
    expect(crawlerDisallow("/research")).toEqual(["/research"]);
  });

  it("blocks private routes, including query strings, and leaves the public exhibition crawlable", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules.flatMap((rule) => rule.disallow ?? []) : [];
    const blocked = (urlPath: string) => googleRobotsBlocks(urlPath, disallow);
    expect(blocked("/login?redirect=/artist/me")).toBe(true);
    expect(blocked("/artist/me?tab=portfolio")).toBe(true);
    expect(blocked("/admin?tab=users")).toBe(true);
    expect(blocked("/exhibitions/new")).toBe(true);
    expect(blocked("/exhibitions/new?draft=1")).toBe(true);
    expect(blocked("/exhibitions/new/draft")).toBe(true);
    expect(blocked("/ko/exhibitions/new?draft=1")).toBe(true);
    expect(blocked("/en/exhibitions/new?draft=1")).toBe(true);
    expect(blocked("/ja/exhibitions/new?draft=1")).toBe(true);
    expect(blocked("/zh-Hans/exhibitions/new?draft=1")).toBe(true);
    expect(blocked("/zh-Hant/exhibitions/new?draft=1")).toBe(true);
    expect(blocked("/ja/exhibitions/new-works-2025")).toBe(false);
    expect(blocked("/zh-Hans/exhibitions/new-works-2025")).toBe(false);
    expect(blocked("/zh-Hant/exhibitions/new-works-2025")).toBe(false);
    expect(blocked("/research?job=1")).toBe(true);
    expect(blocked("/exhibitions/new-works-2025")).toBe(false);
    expect(blocked("/ko/exhibitions/new-works-2025")).toBe(false);
    expect(blocked("/en/exhibitions/new-works-2025")).toBe(false);
    expect(blocked("/exhibitions/new-works-2025?lang=en")).toBe(false);
    expect(blocked("/artists/lee-ufan")).toBe(false);
    expect(blocked("/")).toBe(false);
  });

  it("marks legacy product routes noindex without hiding the current about pages", () => {
    expect(legacyNoindexPath("/artists")).toBe(true);
    expect(legacyNoindexPath("/open-calls")).toBe(true);
    expect(legacyNoindexPath("/country/kr")).toBe(true);
    expect(legacyNoindexPath("/about")).toBe(true);
    expect(legacyNoindexPath("/guide")).toBe(true);
    expect(legacyNoindexPath("/guide/activity-certification")).toBe(true);
    expect(legacyNoindexPath("/about/why-rob")).toBe(false);
    expect(legacyNoindexPath("/artists/lee-ufan")).toBe(false);
  });
});

describe("sitemap eligibility", () => {
  const entries = publicSitemapEntries({
    artists: [{ slug: "haegue-yang", updatedAt: new Date("2026-11-05T08:48:00.000Z") }, { slug: "lee-ufan" }],
    exhibitions: [
      { slug: "when-process-becomes-form", updatedAt: new Date("2026-11-01T00:00:00.000Z") },
      { slug: "new-works-2025" },
    ],
    spaces: [{ slug: "kukje-gallery" }],
  });
  const locs = entries.map((entry) => entry.url);

  it("lists only canonical host URLs once, including both language prefixes", () => {
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs.every((url) => url.startsWith(`${HOST}/`))).toBe(true);
    expect(locs.some((url) => url.includes("www."))).toBe(false);
    expect(locs).toContain(`${HOST}/artists/haegue-yang`);
    expect(locs).toContain(`${HOST}/ko/artists/haegue-yang`);
    expect(locs).toContain(`${HOST}/en/artists/haegue-yang`);
    expect(locs).toContain(`${HOST}/ja/artists/haegue-yang`);
    expect(locs).toContain(`${HOST}/zh-Hans/artists/haegue-yang`);
    expect(locs).toContain(`${HOST}/zh-Hant`);
    expect(locs).toContain(`${HOST}/about/why-rob`);
    expect(locs).toContain(`${HOST}/en/about/why-rob`);
    expect(locs).toContain(`${HOST}/ko/about/how-to-use`);
    expect(locs).not.toContain(`${HOST}/ja/about/why-rob`);
    expect(locs).not.toContain(`${HOST}/zh-Hans/about/why-rob`);
    expect(locs).not.toContain(`${HOST}/zh-Hant/about/how-to-use`);
    expect(locs).not.toContain(`${HOST}/artists/lee-u-fan`);
    expect(locs.some((url) => url.includes("/research"))).toBe(false);
    expect(locs.some((url) => url.includes("/open-calls") || url.includes("/galleries") || url.includes("/country/") || url.includes("/city/"))).toBe(false);
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules.flatMap((rule) => rule.disallow ?? []) : [];
    for (const url of locs) {
      const parsed = new URL(url);
      const urlPath = `${parsed.pathname}${parsed.search}`;
      expect(googleRobotsBlocks(urlPath, disallow), url).toBe(false);
      expect(legacyNoindexPath(parsed.pathname), url).toBe(false);
    }
  });

  it("omits lastModified when no real date exists", () => {
    const haegue = entries.find((entry) => entry.url === `${HOST}/artists/haegue-yang`);
    const lee = entries.find((entry) => entry.url === `${HOST}/artists/lee-ufan`);
    const home = entries.find((entry) => entry.url === `${HOST}/`);
    expect(haegue?.lastModified).toEqual(new Date("2026-11-05T08:48:00.000Z"));
    expect(lee?.lastModified).toBeUndefined();
    expect(home?.lastModified).toBeUndefined();
  });
});

describe("locale URLs", () => {
  it("gives each language a stable prefix and preserves the unprefixed product URL", () => {
    expect(splitLocalePath("/ko/artists/lee-ufan")).toEqual({ locale: "ko", path: "/artists/lee-ufan" });
    expect(splitLocalePath("/ja")).toEqual({ locale: "ja", path: "/" });
    expect(splitLocalePath("/zh-Hans/artists/lee-ufan")).toEqual({ locale: "zh-Hans", path: "/artists/lee-ufan" });
    expect(splitLocalePath("/zh-Hant/open-calls")).toEqual({ locale: "zh-Hant", path: "/open-calls" });
    expect(splitLocalePath("/artists/lee-ufan").locale).toBeNull();
    expect(withLocalePrefix("/artists/lee-ufan?j=1", "en")).toBe("/en/artists/lee-ufan?j=1");
    expect(prefixPublicPath("/artists/lee-ufan", null)).toBe("/artists/lee-ufan");
    expect(prefixPublicPath("/artists/lee-ufan", "ko")).toBe("/ko/artists/lee-ufan");
    expect(prefixPublicPath("/login", null)).toBe("/login");
    expect(prefixPublicPath("/login", "ko")).toBe("/ko/login");
    expect(prefixPublicPath("/artist/public/1wh13", "en")).toBe("/en/artist/public/1wh13");
    expect(swapLocalePrefix("/ko/artists/lee-ufan?event=1", "en")).toBe("/en/artists/lee-ufan?event=1");
    expect(swapLocalePrefix("/en/artists/lee-ufan", "zh-Hant")).toBe("/zh-Hant/artists/lee-ufan");
    expect(swapLocalePrefix("/artists/lee-ufan", "ko")).toBe("/artists/lee-ufan");
  });
});

describe("structured data and artist copy", () => {
  it("keeps schema dates at the recorded precision", () => {
    expect(schemaDate("2024")).toBe("2024");
    expect(schemaDate("2024-05")).toBe("2024-05");
    expect(schemaDate("2024-05-02")).toBe("2024-05-02");
    expect(schemaDate("Date not recorded")).toBeUndefined();
    expect(schemaDate("2024년")).toBeUndefined();
  });

  it("uses factual titles and descriptions", () => {
    const artist = { canonicalName: "Lee Ufan", nativeName: "이우환", exhibitionCount: 6, birthYear: 1936 };
    expect(artistPageTitle(artist, "en")).toBe("Lee Ufan 이우환 — Exhibition History | ROB");
    expect(artistPageTitle(artist, "ko")).toBe("이우환 Lee Ufan — 전시 이력 | ROB");
    expect(artistPageDescription(artist, "en")).toContain("documented exhibition history");
    expect(artistPageDescription(artist, "en").toLowerCase()).not.toContain("famous");
  });
});

describe("verification meta", () => {
  it("renders a token only when one is configured", () => {
    expect(siteVerification(undefined, undefined)).toBeUndefined();
    expect(siteVerification("  ", "naver-token")).toEqual({ other: { "naver-site-verification": "naver-token" } });
    expect(siteVerification("google-token", null)).toEqual({ google: "google-token" });
  });
});

describe("alias redirect preservation", () => {
  it("still sends spelling variants to one canonical artist slug", () => {
    expect(aliasSlugRedirect("lee-u-fan")).toBe("lee-ufan");
    expect(aliasSlugRedirect("lee-ufan")).toBeNull();
    expect(aliasSlugRedirect("lee-fan")).toBeNull();
    expect(withLocalePrefix(`/artists/${aliasSlugRedirect("lee-u-fan")}`, "ko")).toBe("/ko/artists/lee-ufan");
  });
});
