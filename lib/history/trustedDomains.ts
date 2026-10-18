export type TrustedDomainRecord = {
  institutionName: string;
  domain: string;
  sourceClass: "GALLERY_CV" | "MUSEUM" | "MUSEUM_API";
  supportedPageTypes: readonly ("EXHIBITION" | "ARTIST_CV" | "FOUNDATION_CHRONOLOGY" | "ARTIST_PROFILE" | "ARCHIVE_INDEX")[];
  searchMethod: "ARTIST_DIRECTORY" | "INTERNAL_SEARCH" | "SITEMAP" | "PUBLIC_API" | "NONE";
  sitemapUrl: string | null;
  internalSearchUrl: string | null;
  directoryUrl: string | null;
  adapterName: string;
  rateLimitMs: number;
  enabled: boolean;
};

/** Official domains already used by ROB. Search engines are not in this list. */
export const TRUSTED_DOMAINS: readonly TrustedDomainRecord[] = [
  {
    institutionName: "Kukje Gallery",
    domain: "kukjegallery.com",
    sourceClass: "GALLERY_CV",
    supportedPageTypes: ["ARTIST_CV", "EXHIBITION"],
    searchMethod: "ARTIST_DIRECTORY",
    sitemapUrl: null,
    internalSearchUrl: null,
    directoryUrl: "https://www.kukjegallery.com/artists",
    adapterName: "kukje-exhibition",
    rateLimitMs: 1200,
    enabled: true,
  },
  {
    institutionName: "Gallery Hyundai",
    domain: "galleryhyundai.com",
    sourceClass: "GALLERY_CV",
    supportedPageTypes: ["EXHIBITION", "ARCHIVE_INDEX"],
    searchMethod: "SITEMAP",
    sitemapUrl: "https://www.galleryhyundai.com/sitemap.xml",
    internalSearchUrl: null,
    directoryUrl: null,
    adapterName: "hyundai-exhibition",
    rateLimitMs: 1200,
    enabled: true,
  },
  {
    institutionName: "Arario Gallery",
    domain: "arariogallery.com",
    sourceClass: "GALLERY_CV",
    supportedPageTypes: ["EXHIBITION"],
    searchMethod: "NONE",
    sitemapUrl: null,
    internalSearchUrl: null,
    directoryUrl: null,
    adapterName: "arario-exhibition",
    rateLimitMs: 1200,
    enabled: true,
  },
  {
    institutionName: "MMCA",
    domain: "mmca.go.kr",
    sourceClass: "MUSEUM",
    supportedPageTypes: ["EXHIBITION"],
    searchMethod: "NONE",
    sitemapUrl: null,
    internalSearchUrl: null,
    directoryUrl: null,
    adapterName: "mmca-exhibition",
    rateLimitMs: 1200,
    enabled: true,
  },
  {
    institutionName: "Tate",
    domain: "tate.org.uk",
    sourceClass: "MUSEUM",
    supportedPageTypes: ["EXHIBITION", "ARTIST_PROFILE"],
    searchMethod: "INTERNAL_SEARCH",
    sitemapUrl: null,
    internalSearchUrl: "https://www.tate.org.uk/search?q={query}",
    directoryUrl: null,
    adapterName: "tate-exhibition",
    rateLimitMs: 1200,
    enabled: true,
  },
  {
    institutionName: "Art Institute of Chicago",
    domain: "artic.edu",
    sourceClass: "MUSEUM_API",
    supportedPageTypes: ["EXHIBITION", "ARTIST_PROFILE"],
    searchMethod: "PUBLIC_API",
    sitemapUrl: null,
    internalSearchUrl: "https://api.artic.edu/api/v1/agents/search?q={query}&limit=5&fields=id,title",
    directoryUrl: null,
    adapterName: "aic-exhibition",
    rateLimitMs: 1200,
    enabled: true,
  },
  {
    institutionName: "Cleveland Museum of Art",
    domain: "clevelandart.org",
    sourceClass: "MUSEUM_API",
    supportedPageTypes: ["EXHIBITION"],
    searchMethod: "SITEMAP",
    sitemapUrl: "https://www.clevelandart.org/sitemap.xml",
    internalSearchUrl: null,
    directoryUrl: null,
    adapterName: "cleveland-exhibition",
    rateLimitMs: 1200,
    enabled: true,
  },
  {
    institutionName: "Guggenheim",
    domain: "guggenheim.org",
    sourceClass: "MUSEUM",
    supportedPageTypes: ["EXHIBITION"],
    searchMethod: "SITEMAP",
    sitemapUrl: "https://www.guggenheim.org/wp-sitemap.xml",
    internalSearchUrl: null,
    directoryUrl: null,
    adapterName: "museum-api",
    rateLimitMs: 1200,
    enabled: true,
  },
];

export function enabledDirectories(): TrustedDomainRecord[] {
  return TRUSTED_DOMAINS.filter((domain) => domain.enabled && domain.searchMethod === "ARTIST_DIRECTORY" && domain.directoryUrl);
}
