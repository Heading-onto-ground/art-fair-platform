import type { MetadataRoute } from "next";
import { withLocalePrefix } from "@/lib/history/localeUrl";
import { SITE_URL } from "@/lib/seo";

type Entry = MetadataRoute.Sitemap[number];

function entry(path: string, lastModified?: Date | null): Entry {
  const item: Entry = { url: `${SITE_URL}${path}` };
  if (lastModified) item.lastModified = new Date(lastModified);
  return item;
}

function localized(path: string, lastModified?: Date | null): Entry[] {
  return [
    entry(path, lastModified),
    entry(withLocalePrefix(path, "ko"), lastModified),
    entry(withLocalePrefix(path, "en"), lastModified),
  ];
}

export function publicSitemapEntries(input: {
  artists: { slug: string; updatedAt?: Date | null }[];
  exhibitions: { slug: string; updatedAt?: Date | null }[];
  spaces: { slug: string }[];
}): Entry[] {
  return [
    ...localized("/"),
    ...localized("/about/why-rob"),
    ...localized("/about/how-to-use"),
    ...localized("/history/explore"),
    ...input.artists.flatMap((artist) => localized(`/artists/${encodeURIComponent(artist.slug)}`, artist.updatedAt)),
    ...input.exhibitions.flatMap((exhibition) => localized(`/exhibitions/${encodeURIComponent(exhibition.slug)}`, exhibition.updatedAt)),
    ...input.spaces.flatMap((space) => localized(`/spaces/${encodeURIComponent(space.slug)}`)),
  ];
}
