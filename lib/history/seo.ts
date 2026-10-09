import type { HistoryArtistView, HistoryExhibitionPage, HistorySpacePage } from "@/lib/history/types";

export function artistPageTitle(name: string): string {
  return `${name}: Exhibition History & Connections | ROB`;
}

export function exhibitionPageTitle(title: string): string {
  return `${title}: Artists, Space & History | ROB`;
}

export function spacePageTitle(name: string): string {
  return `${name}: Exhibitions & Artists | ROB`;
}

export function artistPageDescription(artist: Pick<HistoryArtistView, "canonicalName" | "nativeName" | "exhibitionCount" | "birthYear">): string {
  const native = artist.nativeName ? ` ${artist.nativeName}.` : "";
  const born = artist.birthYear ? ` Born ${artist.birthYear}.` : "";
  return `${artist.canonicalName}.${native}${born} ${artist.exhibitionCount} documented exhibitions on ROB.`;
}

export function artistJsonLd(input: { name: string; nativeName: string | null; url: string; birthYear: number | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    ...(input.nativeName ? { alternateName: input.nativeName } : {}),
    url: input.url,
    ...(input.birthYear ? { birthDate: String(input.birthYear) } : {}),
  };
}

export function exhibitionJsonLd(input: HistoryExhibitionPage & { url: string }) {
  const start = input.dateLabel === "Date not recorded" ? undefined : input.dateLabel;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    url: input.url,
    ...(start ? { startDate: start } : {}),
    ...(input.endLabel ? { endDate: input.endLabel } : {}),
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
