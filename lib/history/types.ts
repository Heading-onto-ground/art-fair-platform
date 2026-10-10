import type { HistoryImage } from "@/lib/history/images";
import type { HistoryDensity } from "@/lib/history/policy";

export type HistorySearchResult = {
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  birthYear: number | null;
  exhibitionCount: number;
  signature: number[];
};

export type HistorySourceView = {
  id: string;
  url: string;
  sourceName: string;
  sourceType: string;
};

export type HistoryPersonRef = {
  id: string;
  slug: string;
  name: string;
  nativeName: string | null;
};

export type HistoryExhibitionView = {
  id: string;
  slug: string | null;
  title: string;
  year: number | null;
  precision: string;
  dateLabel: string;
  endLabel: string | null;
  spaceId: string | null;
  spaceName: string | null;
  spaceSlug: string | null;
  city: string | null;
  country: string | null;
  curatorId: string | null;
  curatorName: string | null;
  curatorSlug: string | null;
  artists: HistoryPersonRef[];
  sources: HistorySourceView[];
  provenance: string;
  review: boolean;
  coverImage: HistoryImage | null;
};

export type HistoryConnection = {
  id: string;
  slug: string | null;
  name: string;
  nativeName: string | null;
  count: number;
  exhibitions: { id: string; slug: string | null; title: string }[];
};

export type HistoryWorkView = {
  id: string;
  title: string;
  year: number | null;
  imageUrl: string | null;
};

export type HistoryArtistView = {
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  birthYear: number | null;
  country: string | null;
  city: string | null;
  officialWebsite: string | null;
  exhibitionCount: number;
  density: HistoryDensity;
  indexEligible: boolean;
  heroImage: HistoryImage | null;
  worksHref: string | null;
  exhibitions: HistoryExhibitionView[];
  artists: HistoryConnection[];
  spaces: HistoryConnection[];
  curators: HistoryConnection[];
  works: HistoryWorkView[];
};

export type HistoryExhibitionPage = {
  id: string;
  slug: string;
  title: string;
  dateLabel: string;
  endLabel: string | null;
  spaceName: string | null;
  spaceSlug: string | null;
  city: string | null;
  country: string | null;
  curatorName: string | null;
  curatorSlug: string | null;
  artists: HistoryPersonRef[];
  sources: HistorySourceView[];
  provenance: string;
  unresolved: { label: string; status: string }[];
  indexEligible: boolean;
};

export type HistorySpacePage = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  exhibitions: {
    id: string;
    slug: string | null;
    title: string;
    year: number | null;
    dateLabel: string;
    artists: HistoryPersonRef[];
  }[];
  indexEligible: boolean;
};
