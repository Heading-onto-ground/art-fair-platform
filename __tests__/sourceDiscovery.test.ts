import { describe, expect, it } from "vitest";
import type { CrawlFact } from "@/lib/history/trustedCrawl";
import {
  CONTROL_ARTISTS,
  VOICE_ACTOR_ENTITY_ID,
  aliasesFor,
  classifySearchHit,
  discoverTrustedSources,
  discoveryReadiness,
  selectDiscoveryEntity,
  extractionCoverage,
  sourceDiscoveryAcceptance,
  summarizeCrawlerDryRun,
  type DiscoveryEntity,
  type DiscoveryInstitution,
} from "@/lib/history/sourceDiscovery";

function entity(input: Partial<DiscoveryEntity> & Pick<DiscoveryEntity, "id" | "label">): DiscoveryEntity {
  return {
    description: "",
    aliases: [],
    instanceOf: ["Q5"],
    occupations: ["Q1028181"],
    officialWebsites: [],
    collectionIds: [],
    ...input,
  };
}

const tate: DiscoveryInstitution = {
  id: "Q430682",
  label: "Tate",
  description: "art institution in the United Kingdom",
  instanceOf: ["Q1047437"],
  officialWebsites: ["http://www.tate.org.uk", "https://www.tate.org.uk/"],
};

const university: DiscoveryInstitution = {
  id: "Q491511",
  label: "Hongik University",
  description: "private university in Seoul",
  instanceOf: ["Q3918"],
  officialWebsites: ["https://www.hongik.ac.kr/"],
};

describe("source discovery", () => {
  it("keeps an exact artist and drops an encyclopedia item and a press item", () => {
    const result = discoverTrustedSources({
      artistId: "park-seo-bo",
      entities: [
        entity({
          id: "Q4984536",
          label: "Park Seo-bo",
          aliases: ["박서보", "Park Seo-Bo"],
          officialWebsites: ["https://www.wikidata.org/wiki/Q4984536"],
          collectionIds: ["Q430682", "Q491511"],
        }),
        entity({
          id: "Q103961027",
          label: "Park Seo Bo",
          description: "encyclopedia article",
          instanceOf: ["Q17329259"],
          occupations: [],
        }),
        entity({
          id: "Q123756750",
          label: "Park Seo-Bo, Whose Quiet Paintings Trumpeted Korean Art, Dies at 91",
          description: "The New York Times article",
          instanceOf: [],
          occupations: [],
        }),
      ],
      institutions: [tate, university],
    });
    expect(result.resolvedEntityId).toBe("Q4984536");
    expect(result.rejectedEntityIds).toEqual(["Q103961027"]);
    expect(result.candidates.map((item) => item.sourceDomain)).toEqual(["tate.org.uk"]);
    expect(result.candidates[0]).toMatchObject({
      artistId: "park-seo-bo",
      canonicalArtistName: "Park Seo-Bo",
      sourceType: "MUSEUM",
      sourceTier: "MUSEUM",
      discoveryMethod: "WIKIDATA_INSTITUTION",
      identityMatch: "EXACT_ALIAS",
      confidence: "HIGH",
    });
    expect(result.candidates[0]?.sourceUrl).toBe("https://tate.org.uk");
    expect(JSON.stringify(result.candidates)).not.toContain("wikidata.org");
    expect(JSON.stringify(result.candidates)).not.toContain("hongik.ac.kr");
  });

  it("does not link a namesake or a title that only contains the artist", () => {
    const namesake = discoverTrustedSources({
      artistId: "lee-seung-jio",
      entities: [
        entity({
          id: "Q12612046",
          label: "이영달",
          description: "South Korean voice actor",
          aliases: ["이승조"],
          occupations: ["Q2405480"],
          officialWebsites: ["https://voice.example/lee"],
        }),
        entity({
          id: "Q12611925",
          label: "이승조 (화가)",
          description: "South Korean painter",
          collectionIds: ["Q430682"],
        }),
      ],
      institutions: [tate],
      searchHits: [
        { title: "Lee Ufan Museum", url: "https://leeufan.example/museum" },
        { title: "Park Seo-Bo dies at 91", url: "https://www.nytimes.com/park-seo-bo" },
        { title: "Park Seo-Bo", url: "https://www.instagram.com/parkseobo/" },
        { title: "Park Seo-Bo", url: "https://www.artsy.net/artist/park-seo-bo" },
        { title: "Park Seo-Bo", url: "https://www.google.com/search?q=Park+Seo-Bo" },
      ],
    });
    expect(namesake.resolvedEntityId).toBe("Q12611925");
    expect(namesake.identityBasis).toBe("STRUCTURED_NATIVE_LABEL");
    expect(namesake.rejectedEntityIds).toEqual(["Q12612046"]);
    expect(namesake.resolvedEntityId).not.toBe(VOICE_ACTOR_ENTITY_ID);
    expect(namesake.candidates.map((item) => item.sourceDomain)).toEqual(["tate.org.uk"]);
    expect(aliasesFor("lee-seung-jio")).not.toContain("이승조 (화가)");
    expect(classifySearchHit({ title: "Park Seo-Bo", url: "https://blog.example/park-seo-bo" }, "park-seo-bo")).toBeNull();
  });

  it("does not choose between two visual artists who share a native label", () => {
    const ambiguous = selectDiscoveryEntity([
      entity({ id: "Q1", label: "이승조 (화가)" }),
      entity({ id: "Q2", label: "이승조 (미술가)", description: "South Korean painter" }),
    ], "lee-seung-jio");
    expect(ambiguous.selected).toBeNull();
    expect(ambiguous.rejectedEntityIds).toEqual(["Q1", "Q2"]);
  });

  it("keeps a visual artist who is also listed as a writer", () => {
    const artist = selectDiscoveryEntity([
      entity({ id: "Q399775", label: "Lee Ufan", occupations: ["Q1281618", "Q36180"] }),
    ], "lee-ufan");
    expect(artist.selected?.id).toBe("Q399775");
    expect(artist.identityBasis).toBe("EXACT_ALIAS");
  });

  it("accepts a trusted-host search hit and keeps one url per domain", () => {
    const result = discoverTrustedSources({
      artistId: "park-seo-bo",
      entities: [],
      institutions: [],
      searchHits: [
        { title: "Park Seo-Bo", url: "https://www.kukjegallery.com/artists/view?seq=181" },
        { title: "Park Seo-Bo", url: "https://www.kukjegallery.com/exhibitions/view?seq=295" },
        { title: "Park Seo-Bo", url: "https://www.kukjegallery.com/news/view?seq=1" },
        { title: "Another Artist", url: "https://www.galleryhyundai.com/exhibition/view/11" },
      ],
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      sourceDomain: "kukjegallery.com",
      sourceType: "REPRESENTING_GALLERY",
      discoveryMethod: "SEARCH_HIT",
      confidence: "MEDIUM",
    });
  });

  it("matches a verified spelling alias and refuses two exact artists", () => {
    const matched = selectDiscoveryEntity([
      entity({ id: "Q23068024", label: "Ha Chonghyun", aliases: ["Ha Chong-Hyun"] }),
    ], "ha-chong-hyun");
    expect(matched.selected?.id).toBe("Q23068024");
    const ambiguous = selectDiscoveryEntity([
      entity({ id: "Q1", label: "Kim Hyung Dae" }),
      entity({ id: "Q2", label: "Kim Hyung Dae", aliases: ["김형대"] }),
    ], "kim-hyung-dae");
    expect(ambiguous.selected).toBeNull();
    expect(ambiguous.rejectedEntityIds).toEqual(["Q1", "Q2"]);
  });

  it("measures a crawler dry run without treating search pages as provenance", () => {
    const participant = {
      label: "Lee Ufan",
      slug: "lee-ufan",
      evidence: "EXPLICIT_PARTICIPANT" as const,
      identity: "EXACT" as const,
      evidenceLocation: "artist-link",
    };
    const facts: Pick<CrawlFact, "title" | "decision" | "participants">[] = [
      { title: "From Line", decision: "REVIEW_QUEUE", participants: [participant, { ...participant, label: "Unknown", slug: null, identity: "UNRESOLVED" }] },
      { title: null, decision: "HOLD", participants: [] },
    ];
    expect(summarizeCrawlerDryRun(facts)).toEqual({
      extractableFactCount: 1,
      explicitParticipationCount: 1,
      reviewCount: 1,
    });
    const readiness = discoveryReadiness([
      { artistId: "park-seo-bo", candidates: discoverTrustedSources({ artistId: "park-seo-bo", entities: [entity({ id: "Q4984536", label: "Park Seo-Bo", collectionIds: ["Q430682"] })], institutions: [tate] }).candidates, wrongPersonLinks: 0 },
      { artistId: "lee-ufan", candidates: [{ artistId: "lee-ufan", canonicalArtistName: "Lee Ufan", sourceName: "Museum of Modern Art", sourceUrl: "https://moma.org", sourceDomain: "moma.org", sourceType: "MUSEUM", sourceTier: "MUSEUM_API", discoveryMethod: "WIKIDATA_INSTITUTION", identityMatch: "EXACT_ALIAS", confidence: "HIGH", discoveryReason: "EXACT_ALIAS_AND_INSTITUTION_SITE" }], wrongPersonLinks: 0 },
      { artistId: "ha-chong-hyun", candidates: [{ artistId: "ha-chong-hyun", canonicalArtistName: "Ha Chong-Hyun", sourceName: "Art Institute of Chicago", sourceUrl: "https://artic.edu", sourceDomain: "artic.edu", sourceType: "MUSEUM", sourceTier: "MUSEUM", discoveryMethod: "WIKIDATA_INSTITUTION", identityMatch: "EXACT_ALIAS", confidence: "HIGH", discoveryReason: "EXACT_ALIAS_AND_INSTITUTION_SITE" }], wrongPersonLinks: 0 },
      { artistId: "yun-hyong-keun", candidates: [{ artistId: "yun-hyong-keun", canonicalArtistName: "Yun Hyong-keun", sourceName: "Tate", sourceUrl: "https://tate.org.uk", sourceDomain: "tate.org.uk", sourceType: "MUSEUM", sourceTier: "MUSEUM", discoveryMethod: "WIKIDATA_INSTITUTION", identityMatch: "EXACT_ALIAS", confidence: "HIGH", discoveryReason: "EXACT_ALIAS_AND_INSTITUTION_SITE" }], wrongPersonLinks: 0 },
      { artistId: "lee-seung-jio", candidates: [], wrongPersonLinks: 0 },
    ]);
    expect(readiness.artistsWithTrustedCandidate).toBe(4);
    expect(readiness.wrongPersonLinks).toBe(0);
    expect(readiness.searchResultProvenance).toBe(0);
    expect(readiness.decision).toBe("ROB_SOURCE_DISCOVERY_V1_READY");
    expect(CONTROL_ARTISTS).toHaveLength(5);
    expect(extractionCoverage([
      { fetchable: true, pageType: "EXHIBITION", note: "INCOMPLETE_FACT", facts: [{ title: "Working With Nature", decision: "REVIEW_QUEUE", reason: "INCOMPLETE_FACT", duplicate: "NEW" }] },
      { fetchable: true, pageType: "EXHIBITION", note: "NO_PARTICIPANT_LIST", facts: [{ title: "Material and Immaterial", decision: "REVIEW_QUEUE", reason: "NO_PARTICIPANT_LIST", duplicate: "NEW" }] },
      { fetchable: false, pageType: null, note: "SOURCE_UNAVAILABLE", facts: [] },
      { fetchable: false, pageType: null, note: "HOST_OUTSIDE_V1", facts: [] },
    ])).toEqual({
      discoveredUrls: 4,
      fetchSupported: 3,
      exhibitionPages: 2,
      factualCandidates: 2,
      autoImportEligible: 0,
      reviewOrIncomplete: 2,
      exact: 0,
      sourceUnavailable: 1,
    });
    expect(sourceDiscoveryAcceptance({
      controlArtists: 5,
      artistsWithTrustedCandidate: 4,
      wrongPersonLinks: 0,
      searchResultProvenance: 0,
      resolvedVoiceActor: false,
      crawlerSafetyRegressions: 0,
      productionWrites: 0,
    })).toBe("ROB_SOURCE_DISCOVERY_V1_ACCEPTED");
    expect(sourceDiscoveryAcceptance({
      controlArtists: 5,
      artistsWithTrustedCandidate: 3,
      wrongPersonLinks: 0,
      searchResultProvenance: 0,
      resolvedVoiceActor: false,
      crawlerSafetyRegressions: 0,
      productionWrites: 0,
    })).toBe("ROB_SOURCE_DISCOVERY_V1_BLOCKED");
    expect(sourceDiscoveryAcceptance({
      controlArtists: 5,
      artistsWithTrustedCandidate: 5,
      wrongPersonLinks: 1,
      searchResultProvenance: 0,
      resolvedVoiceActor: true,
      crawlerSafetyRegressions: 0,
      productionWrites: 0,
    })).toBe("ROB_SOURCE_DISCOVERY_IDENTITY_BLOCKED");
  });
});
