import { pluralCount } from "@/lib/history/copy";
import type { HistoryLocale } from "@/lib/history/locale";
import { artistDisplayNames } from "@/lib/history/names";
import type { HistoryArtistView, HistoryExhibitionPage, HistorySpacePage } from "@/lib/history/types";

export function schemaDate(label: string | null | undefined): string | undefined {
  if (!label || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(label)) return undefined;
  return label;
}

export function artistPageTitle(
  artist: Pick<HistoryArtistView, "canonicalName" | "nativeName">,
  locale: HistoryLocale,
): string {
  const names = artistDisplayNames({ canonicalName: artist.canonicalName, nativeName: artist.nativeName, locale });
  const name = names.secondary ? `${names.primary} ${names.secondary}` : names.primary;
  if (locale === "ko") return `${name} — 전시 이력 | ROB`;
  return `${name} — Exhibition History | ROB`;
}

export function exhibitionPageTitle(title: string): string {
  return `${title}: Artists, Space & History | ROB`;
}

export function spacePageTitle(name: string): string {
  return `${name}: Exhibitions & Artists | ROB`;
}

export function artistPageDescription(
  artist: Pick<HistoryArtistView, "canonicalName" | "nativeName" | "exhibitionCount" | "birthYear">,
  locale: HistoryLocale,
): string {
  const name = artistDisplayNames({ canonicalName: artist.canonicalName, nativeName: artist.nativeName, locale }).primary;
  const born = artist.birthYear ? (locale === "ko" ? ` ${artist.birthYear}년생.` : ` Born ${artist.birthYear}.`) : "";
  if (locale === "ko") {
    return `${name}의 기록된 전시 이력.${born} 전시 ${artist.exhibitionCount}건. 출처는 각 기록에 붙어 있습니다.`;
  }
  return `${name}'s documented exhibition history, spaces and artist connections on ROB.${born} ${pluralCount(artist.exhibitionCount, "documented exhibition")}. Sources are attached to individual records.`;
}

export function artistJsonLd(input: {
  name: string;
  nativeName: string | null;
  aliases?: string[];
  url: string;
  birthYear: number | null;
  sameAs?: string | null;
}) {
  const alternateName = [input.nativeName, ...(input.aliases ?? [])].filter((name): name is string => Boolean(name) && name !== input.name);
  const sameAs = input.sameAs && /^https?:\/\//.test(input.sameAs) ? [input.sameAs] : [];
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    ...(alternateName.length ? { alternateName } : {}),
    url: input.url,
    ...(input.birthYear ? { birthDate: String(input.birthYear) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

export function websiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ROB",
    url: siteUrl,
    description: "Search artists and explore documented exhibitions, spaces, curators, and artist connections.",
  };
}

export function exhibitionJsonLd(input: HistoryExhibitionPage & { url: string }) {
  const start = schemaDate(input.dateLabel);
  const end = schemaDate(input.endLabel);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    url: input.url,
    ...(start ? { startDate: start } : {}),
    ...(end ? { endDate: end } : {}),
    ...(input.spaceName
      ? {
          location: {
            "@type": "Place",
            name: input.spaceName,
            ...(input.city || input.country
              ? { address: { "@type": "PostalAddress", ...(input.city ? { addressLocality: input.city } : {}), ...(input.country ? { addressCountry: input.country } : {}) } }
              : {}),
          },
        }
      : {}),
  };
}

export function spaceJsonLd(input: HistorySpacePage & { url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: input.name,
    url: input.url,
    ...(input.city || input.country
      ? { address: { "@type": "PostalAddress", ...(input.city ? { addressLocality: input.city } : {}), ...(input.country ? { addressCountry: input.country } : {}) } }
      : {}),
  };
}
