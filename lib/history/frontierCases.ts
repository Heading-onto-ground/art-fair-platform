import { frontierStatus, type FrontierStatus } from "@/lib/history/growth";

export type FrontierCaseSpec = {
  name: string;
  slug: string | null;
  sourceUrl: string | null;
  blocked?: boolean;
  verified?: boolean;
  requireConnection?: boolean;
  reason: string;
};

/** Decisions that must not be inferred from spelling. Live record counts come from the public graph. */
export const FRONTIER_CASES: readonly FrontierCaseSpec[] = [
  {
    name: "Kim, Guirin",
    slug: null,
    sourceUrl: null,
    blocked: true,
    reason: "No source states that this comma spelling is Kim Guiline.",
  },
  {
    name: "Kim Hyung Dae",
    slug: "kim-hyung-dae",
    sourceUrl: "https://www.naa.go.kr/member/view?memb_id=537",
    verified: true,
    requireConnection: true,
    reason: "Identity is verified. He stays without an entity until a public exhibition lists him as a participant.",
  },
  {
    name: "Youn Myeungro",
    slug: "youn-myeungro",
    sourceUrl: "https://www.naa.go.kr/member/view?memb_id=359",
    verified: true,
    reason: "National Academy of Arts member 359. Indexing follows the existing density rule.",
  },
  {
    name: "Lee Seung Jio",
    slug: "lee-seung-jio",
    sourceUrl: "https://www.kukjegallery.com/exhibitions/view?seq=245",
    verified: true,
    reason: "Kukje Gallery states Lee Seung Jio, 이승조, born 1941, died 1990.",
  },
  {
    name: "Park Hyun-Ki",
    slug: "park-hyun-ki",
    sourceUrl: "https://www.kukjegallery.com/news/view?seq=762",
    verified: true,
    reason: "The Kukje Landlord Colors note lists Park Hyun-Ki and 박현기 in the same participant list. It does not state birth or death years.",
  },
];

export function statusForFrontierCase(
  spec: Pick<FrontierCaseSpec, "blocked" | "verified" | "requireConnection">,
  live: { entityExists: boolean; recordCount: number },
): FrontierStatus {
  if (spec.blocked) return frontierStatus({});
  if (live.entityExists && live.recordCount > 0) return frontierStatus({ imported: true });
  if (spec.verified && spec.requireConnection) return frontierStatus({ identityVerified: true, sourceFound: true });
  if (spec.verified) return frontierStatus({ identityVerified: true });
  return frontierStatus({});
}

export type NamedFrontier = FrontierCaseSpec & {
  status: FrontierStatus;
  recordCount: number;
};

export function namedFrontier(artists: { slug: string; exhibitionCount: number }[]): NamedFrontier[] {
  return FRONTIER_CASES.map((spec) => {
    const artist = spec.slug ? artists.find((row) => row.slug === spec.slug) : undefined;
    const recordCount = artist?.exhibitionCount ?? 0;
    return {
      ...spec,
      recordCount,
      status: statusForFrontierCase(spec, { entityExists: Boolean(artist), recordCount }),
    };
  });
}
