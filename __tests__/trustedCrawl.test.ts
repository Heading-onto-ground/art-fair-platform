import { describe, expect, it } from "vitest";
import { mayCreateParticipation } from "@/lib/history/identity";
import type { GrowthSnapshot } from "@/lib/history/growth";
import { envValue, envValueFromText } from "@/lib/history/runtimeEnv";
import {
  CRAWL_LIMITS,
  crawlArtists,
  crawlTrustedPage,
  fetchTrustedDocument,
  spaceDecisionFor,
  trustedCrawlReport,
  trustedImportBatch,
  unavailableFact,
} from "@/lib/history/trustedCrawl";

const retrievedAt = "2026-10-16";
const artists = crawlArtists([{ slug: "lee-seung-jio", labels: ["Lee Seung Jio", "이승조"] }]);

function snapshot(exhibitions: GrowthSnapshot["exhibitions"] = []): GrowthSnapshot {
  return {
    artists: artists.map((artist) => ({ ...artist, exhibitionIds: [] })),
    exhibitions,
    unresolved: [],
  };
}

function crawl(input: { url: string; html?: string; json?: unknown; text?: string; subjectLabel?: string; snapshotReady?: boolean; exhibitions?: GrowthSnapshot["exhibitions"] }) {
  return crawlTrustedPage({
    url: input.url,
    retrievedAt,
    html: input.html,
    json: input.json,
    text: input.text,
    subjectLabel: input.subjectLabel,
    artists,
    snapshot: snapshot(input.exhibitions),
    snapshotReady: input.snapshotReady,
  });
}

const kukjeSolo = `
  <span class="page-main-list-area__title">Seoul &nbsp; K1 &nbsp; K2</span>
  <span class="page-main-list-artist__name-text"><a href="/artists/view?seq=413">Lee Seung Jio</a></span>
  <span class="page-main-list-artist__exhibition">LEE SEUNG JIO</span>
  <p class="page-main-list-time">September 1 – October 30, 2022</p>
  <p>Essay token KUKJE_ESSAY_TOKEN is not a participant list.</p>
`;

describe("trusted source crawler", () => {
  it("imports a Kukje exhibition header when the artist link is an exact identity", () => {
    const [fact] = crawl({ url: "https://www.kukjegallery.com/exhibitions/view?seq=245", html: kukjeSolo });
    expect(fact?.decision).toBe("AUTO_IMPORT");
    expect(fact?.confidence).toBe("HIGH");
    expect(fact?.participants).toEqual([
      { label: "Lee Seung Jio", slug: "lee-seung-jio", evidence: "EXPLICIT_PARTICIPANT", identity: "EXACT", evidenceLocation: "artist-link" },
    ]);
    expect(fact?.title).toBe("LEE SEUNG JIO");
    expect(fact?.startYear).toBe(2022);
    expect(fact?.startMonth).toBe(9);
    expect(fact?.startDay).toBe(1);
    expect(fact?.endMonth).toBe(10);
    expect(fact?.endDay).toBe(30);
    expect(fact?.venue).toBe("Kukje Gallery");
    expect(fact?.city).toBe("Seoul");
    expect(fact?.graph?.newExhibition).toBe(true);
    expect(fact?.provenance.extractionMethod).toBe("KUKJE_EXHIBITION_HEADER");
    expect(fact?.provenance.titleSource?.sourceUrl).toBe("https://www.kukjegallery.com/exhibitions/view?seq=245");
    expect(fact?.provenance.participantSource?.sourceName).toBe("Kukje Gallery");
    expect(JSON.stringify(fact)).not.toContain("KUKJE_ESSAY_TOKEN");
    const batch = trustedImportBatch([fact!], retrievedAt, snapshot());
    expect(batch?.records).toHaveLength(1);
    expect(batch?.records[0]?.participants).toEqual(["Lee Seung Jio"]);
    expect(batch?.artists).toEqual([]);
    expect(batch?.enrichments).toEqual([]);
  });

  it("does not link a name that appears only in the exhibition title", () => {
    const html = `
      <span class="page-main-list-area__title">Seoul</span>
      <span class="page-main-list-artist__name-text"><a>Park Seo-Bo</a></span>
      <span class="page-main-list-artist__exhibition">Park Seo-Bo, Kim Hyung Dae, Korean Art</span>
      <p class="page-main-list-time">September 1 – October 30, 2018</p>
    `;
    const [fact] = crawl({ url: "https://www.kukjegallery.com/exhibitions/view?seq=1", html });
    expect(fact?.participants.map((person) => person.label)).toEqual(["Park Seo-Bo"]);
    expect(fact?.participants.every((person) => mayCreateParticipation(person.evidence))).toBe(true);
    expect(fact?.decision).toBe("AUTO_IMPORT");
    const titleOnly = crawl({
      url: "https://www.arariogallery.com/exhibitions/example/",
      html: `<span class="h1_heading">Park Seo-Bo, Kim Hyung Dae, Korean Art</span><span class="subtitle_date">1 May - 2 June 2018</span><span class="location">Seoul</span>`,
    })[0];
    expect(titleOnly?.decision).toBe("HOLD");
    expect(titleOnly?.reason).toBe("TITLE_ONLY");
    expect(mayCreateParticipation(titleOnly?.participants[0]?.evidence ?? "NOT_PARTICIPANT")).toBe(false);
    expect(trustedImportBatch([titleOnly!], retrievedAt, snapshot())).toBeNull();
  });

  it("reviews an Arario heading instead of treating the name as a participant", () => {
    const [fact] = crawl({
      url: "https://www.arariogallery.com/exhibitions/236-youn-myeung-ro-plateau/",
      html: `<span class="h1_heading">YOUN Myeung-Ro: Plateau</span><span class="subtitle_date">5 March - 28 April 2016</span><span class="location"><a>Shanghai</a></span>`,
    });
    expect(fact?.title).toBe("Plateau");
    expect(fact?.city).toBe("Shanghai");
    expect(fact?.venue).toBe("Arario Gallery Shanghai");
    expect(fact?.startDay).toBe(5);
    expect(fact?.endDay).toBe(28);
    expect(fact?.decision).toBe("REVIEW_QUEUE");
    expect(fact?.reason).toBe("TITLE_HEADING");
    expect(fact?.participants[0]?.identity).toBe("UNRESOLVED");
    expect(trustedImportBatch([fact!], retrievedAt, snapshot())).toBeNull();
  });

  it("keeps an explicit but unknown Gallery Hyundai artist in review", () => {
    const html = `
      <span class="exd-title__artist">Christine Sun Kim</span>
      <p class="exd-title__sub exd-title__sub--italic">Moon Mind</p>
      <div class="exd-title__facts"><p>Aug 26 &#8211; Oct 18, 2026</p><p>Hyundai Hwarang</p></div>
    `;
    const [fact] = crawl({ url: "https://www.galleryhyundai.com/exhibition/view/11", html });
    expect(fact?.participants[0]?.evidence).toBe("EXPLICIT_PARTICIPANT");
    expect(fact?.participants[0]?.identity).toBe("UNRESOLVED");
    expect(fact?.decision).toBe("REVIEW_QUEUE");
    expect(fact?.reason).toBe("IDENTITY_UNRESOLVED");
    expect(fact?.venue).toBe("Hyundai Hwarang");
    expect(trustedImportBatch([fact!], retrievedAt, snapshot())).toBeNull();
  });

  it("extracts MMCA factual fields and does not store prose", () => {
    const html = `
      <title>National Museum of Modern and Contemporary Art, Korea</title>
      <h3 class="title">Park Seo Bo: The Untiring Endeavorer</h3>
      <ul class="barList"><li>2019-05-18 ~ 2019-09-01</li><li>Seoul Gallery 1,2</li></ul>
      <dl>
        <dt>Period</dt><dd>2019-05-18 ~ 2019-09-01</dd>
        <dt>Organized by/Supported by</dt><dd>MMCA / Iljin Culture Foundation</dd>
        <dt>Venue</dt><dd>Seoul Gallery 1,2</dd>
        <dt>Artist</dt><dd>Park Seo Bo</dd>
        <dt>Curator</dt><dd>Kim Curator</dd>
      </dl>
      <p>MMCA_PROSE_TOKEN must stay out of the fact.</p>
    `;
    const [fact] = crawl({ url: "https://www.mmca.go.kr/eng/exhibitions/exhibitionsDetail.do?exhId=201905030001151", html });
    expect(fact?.decision).toBe("AUTO_IMPORT");
    expect(fact?.reason).not.toBe("CLEARANCE_REQUIRED");
    expect(fact?.reason).not.toBe("RIGHTS_BLOCKED");
    expect(fact?.title).toBe("Park Seo Bo: The Untiring Endeavorer");
    expect(fact?.startYear).toBe(2019);
    expect(fact?.startMonth).toBe(5);
    expect(fact?.startDay).toBe(18);
    expect(fact?.datePrecision).toBe("DAY");
    expect(fact?.venue).toBe("MMCA");
    expect(fact?.city).toBe("Seoul");
    expect(fact?.country).toBe("Korea");
    expect(fact?.participants[0]).toMatchObject({ label: "Park Seo Bo", slug: "park-seo-bo", evidence: "EXPLICIT_PARTICIPANT", identity: "EXACT" });
    expect(fact?.curators).toEqual([{ rawName: "Kim Curator", evidenceType: "EXPLICIT_CURATOR" }]);
    expect(fact?.fieldProvenance.title?.sourceUrl).toContain("mmca.go.kr");
    expect(fact?.fieldProvenance.participants?.sourceName).toBe("MMCA");
    expect(JSON.stringify(fact)).not.toContain("MMCA_PROSE_TOKEN");
    expect(trustedImportBatch([fact!], retrievedAt, snapshot())?.records).toHaveLength(1);
    const offline = unavailableFact({
      url: "https://www.mmca.go.kr/eng/exhibitions/exhibitionsDetail.do?exhId=missing",
      retrievedAt,
      artists,
      snapshot: snapshot(),
    });
    expect(offline.decision).toBe("SOURCE_UNAVAILABLE");
    expect(offline.reason).not.toBe("RIGHTS_BLOCKED");
  });

  it("rejects press headlines and untrusted hosts", () => {
    const press = crawl({
      url: "https://www.kukjegallery.com/news/view?seq=762",
      html: "<h3>Ha Chong-Hyun, Kwon Young-Woo, Lee Ufan, and Park Seo-Bo Participate</h3>",
    })[0];
    expect(press?.reason).toBe("PRESS_PAGE");
    expect(press?.participants).toEqual([]);
    const blog = crawl({ url: "https://example.com/blog/youn", html: kukjeSolo })[0];
    expect(blog?.decision).toBe("HOLD");
    expect(blog?.reason).toBe("LOW_AUTHORITY");
    expect(blog?.provenance.sourceTier).toBe("LOW_AUTHORITY");
  });

  it("reviews selected foundation rows and does not store the rest of a long CV", () => {
    const lines = crawl({
      url: "https://www.naa.go.kr/member/view?memb_id=359",
      text: "2014 Traces of the Spirit, Arario Gallery\n2016 Plateau, Shanghai\nbiography prose BIO_TOKEN\n",
      subjectLabel: "Youn Myeungro",
    });
    expect(lines.map((fact) => fact.decision)).toEqual(["REVIEW_QUEUE", "REVIEW_QUEUE"]);
    expect(lines.every((fact) => fact.reason === "FOUNDATION_CV")).toBe(true);
    expect(JSON.stringify(lines)).not.toContain("BIO_TOKEN");
    expect(trustedImportBatch(lines, retrievedAt, snapshot())).toBeNull();
    const tooLong = [
      ...Array.from({ length: 12 }, (_, index) => `${2000 + index} Show ${index}`),
      "2012 Show 12 LAST_CV_TOKEN",
    ].join("\n");
    const selected = crawl({ url: "https://www.naa.go.kr/member/view?memb_id=359", text: tooLong, subjectLabel: "Youn Myeungro" });
    expect(selected).toHaveLength(CRAWL_LIMITS.selectiveCvRows);
    expect(selected.every((fact) => fact.reason !== "WHOLE_CV")).toBe(true);
    expect(JSON.stringify(selected)).not.toContain("LAST_CV_TOKEN");
  });

  it("imports a museum API record and ignores an off-host url", () => {
    const [fact] = crawl({
      url: "https://www.guggenheim.org/api/exhibitions",
      json: {
        exhibitions: [{
          title: "Fixture Room",
          artists: ["Lee Ufan"],
          startDate: "2011-06-24",
          endDate: "2011-09-28",
          venue: "Guggenheim Museum",
          city: "New York",
          country: "United States",
          url: "https://example.com/not-a-source",
        }],
      },
    });
    expect(fact?.decision).toBe("AUTO_IMPORT");
    expect(fact?.provenance.sourceUrl).toBe("https://www.guggenheim.org/api/exhibitions");
    expect(fact?.provenance.extractionMethod).toBe("MUSEUM_API_RECORD");
    const batch = trustedImportBatch([fact!], retrievedAt, snapshot());
    expect(batch?.records[0]?.participants).toEqual(["Lee Ufan"]);
    expect(batch?.artists.map((artist) => artist.slug)).toEqual([]);
    const created = trustedImportBatch([fact!], retrievedAt, { artists: [], exhibitions: [], unresolved: [] });
    expect(created?.artists.map((artist) => artist.slug)).toEqual(["lee-ufan"]);
    expect(created?.artists[0]?.birthYear).toBeNull();
  });

  it("writes nothing on a second pass when the exhibition is already recorded", () => {
    const first = crawl({ url: "https://www.kukjegallery.com/exhibitions/view?seq=245", html: kukjeSolo })[0];
    expect(trustedImportBatch([first!], retrievedAt, snapshot())?.records).toHaveLength(1);
    const again = crawl({
      url: "https://www.kukjegallery.com/exhibitions/view?seq=245",
      html: kukjeSolo,
      exhibitions: [{ id: "show-1", title: "LEE SEUNG JIO", year: 2022, space: "Kukje Gallery", city: "Seoul", artistSlugs: ["lee-seung-jio"] }],
    })[0];
    expect(again?.duplicate).toBe("EXACT");
    expect(again?.alreadyRecorded).toBe(true);
    expect(again?.graph?.newExhibition).toBe(false);
    expect(trustedImportBatch([again!], retrievedAt, snapshot())).toBeNull();
    expect(trustedCrawlReport([again!]).autoImport).toBe(0);
    expect(trustedCrawlReport([again!]).alreadyRecorded).toBe(1);
  });

  it("does not auto-import when the graph snapshot was not loaded", () => {
    const [fact] = crawl({ url: "https://www.kukjegallery.com/exhibitions/view?seq=245", html: kukjeSolo, snapshotReady: false });
    expect(fact?.decision).toBe("REVIEW_QUEUE");
    expect(fact?.reason).toBe("SNAPSHOT_REQUIRED");
    expect(trustedImportBatch([fact!], retrievedAt, snapshot())).toBeNull();
  });

  it("keeps an unresolved participant from blocking a known artist", () => {
    const html = `
      <span class="page-main-list-area__title">Seoul</span>
      <span class="page-main-list-artist__name-text"><a href="/artists/view?seq=1">Lee Ufan</a></span>
      <span class="page-main-list-artist__name-text"><a href="/artists/view?seq=2">Unknown Participant</a></span>
      <span class="page-main-list-artist__exhibition">Shared Room</span>
      <p class="page-main-list-time">September 1 – October 30, 2019</p>
    `;
    const [fact] = crawl({ url: "https://www.kukjegallery.com/exhibitions/view?seq=900", html });
    expect(fact?.decision).toBe("AUTO_IMPORT");
    expect(fact?.duplicate).toBe("NEW");
    expect(fact?.participants.map((person) => [person.label, person.identity])).toEqual([
      ["Lee Ufan", "EXACT"],
      ["Unknown Participant", "UNRESOLVED"],
    ]);
    expect(trustedImportBatch([fact!], retrievedAt, snapshot())?.records[0]?.participants).toEqual(["Lee Ufan"]);
    const grouped = crawl({
      url: "https://www.kukjegallery.com/exhibitions/view?seq=214",
      html: `
        <div class="site-location__item--seoul site-location__item--active"></div>
        <span class="page-main-list-area__title">Special Exhibition</span>
        <span class="page-main-list-artist__name-text"><a>Lee Ufan</a>, <a>Unknown Participant</a></span>
        <span class="page-main-list-artist__exhibition">Korean Abstract Art</span>
        <p class="page-main-list-time">November 8, 2018 – March 2, 2019</p>
      `,
    })[0];
    expect(grouped?.city).toBe("Seoul");
    expect(grouped?.decision).toBe("AUTO_IMPORT");
    expect(grouped?.participants.map((person) => person.identity)).toEqual(["EXACT", "UNRESOLVED"]);
    expect(trustedImportBatch([grouped!], retrievedAt, snapshot())?.records[0]?.participants).toEqual(["Lee Ufan"]);
  });

  it("resolves a verified alias and reviews a near-miss space name", () => {
    const html = `
      <span class="page-main-list-area__title">Busan</span>
      <span class="page-main-list-artist__name-text"><a>Lee U-Fan</a></span>
      <span class="page-main-list-artist__exhibition">From Line</span>
      <p class="page-main-list-time">March 2015</p>
    `;
    const [fact] = crawl({ url: "https://www.kukjegallery.com/exhibitions/view?seq=901", html });
    expect(fact?.participants[0]?.slug).toBe("lee-ufan");
    expect(fact?.datePrecision).toBe("MONTH");
    expect(spaceDecisionFor("Kukje Gallery")).toBe("RESOLVED");
    expect(spaceDecisionFor("MMCA")).toBe("RESOLVED");
    expect(spaceDecisionFor("Kukje Gallery Seoul")).toBe("REVIEW");
    expect(spaceDecisionFor("Guggenheim Museum")).toBe("NEW");
    const [fuzzy] = crawl({
      url: "https://www.guggenheim.org/api/exhibitions",
      json: {
        exhibitions: [{
          title: "Near Miss",
          artists: ["Lee Ufan"],
          startDate: "2015-03-01",
          endDate: "2015-04-01",
          venue: "Kukje Gallery Seoul",
          city: "Seoul",
          country: "Korea",
        }],
      },
    });
    expect(fuzzy?.decision).toBe("REVIEW_QUEUE");
    expect(fuzzy?.reason).toBe("SPACE_REVIEW");
    expect(trustedImportBatch([fuzzy!], retrievedAt, snapshot())).toBeNull();
  });

  it("reviews conflicting dates on one page and holds a page with no exhibition fields", () => {
    const conflict = crawl({
      url: "https://www.mmca.go.kr/eng/exhibitions/exhibitionsDetail.do?exhId=conflict",
      html: `
        <title>National Museum of Modern and Contemporary Art, Korea</title>
        <h3 class="title">Date Clash</h3>
        <ul class="barList"><li>2018-01-01 ~ 2018-02-01</li></ul>
        <dt>Period</dt><dd>2019-05-18 ~ 2019-09-01</dd>
        <dt>Organized by</dt><dd>MMCA</dd>
        <dt>Venue</dt><dd>Seoul Gallery 1</dd>
        <dt>Artist</dt><dd>Park Seo Bo</dd>
      `,
    })[0];
    expect(conflict?.decision).toBe("REVIEW_QUEUE");
    expect(conflict?.reason).toBe("DATE_CONFLICT");
    const broken = crawl({ url: "https://www.kukjegallery.com/exhibitions/view?seq=404", html: "<div>no exhibition fields</div>" })[0];
    expect(broken?.decision).toBe("HOLD");
    expect(broken?.reason).toBe("NO_STRUCTURE");
  });

  it("stops a timed-out request and does not fetch the same page twice", async () => {
    let calls = 0;
    const hanging: typeof fetch = (_url, init) => new Promise((_resolve, reject) => {
      calls += 1;
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    });
    const cache = new Map();
    const result = await fetchTrustedDocument("https://www.kukjegallery.com/exhibitions/view?seq=1", {
      fetchImpl: hanging,
      timeoutMs: 30,
      cache,
      sleep: async () => {},
      now: () => 0,
    });
    expect(result.blocked).toBe("SOURCE_UNAVAILABLE");
    expect(calls).toBe(CRAWL_LIMITS.maxAttempts);
    const again = await fetchTrustedDocument("https://www.kukjegallery.com/exhibitions/view?seq=1", {
      fetchImpl: hanging,
      timeoutMs: 30,
      cache,
      sleep: async () => {},
      now: () => 0,
    });
    expect(again.requests).toBe(0);
    expect(calls).toBe(CRAWL_LIMITS.maxAttempts);
  });
});

describe("institution exhibition adapters", () => {
  const tateHtml = `
    <h1>Working With Nature: Traditional Thought in Contemporary Art from Korea</h1>
    <span class="splash-header__dates">8 April – 21 June 1992</span>
    <div class="content-block content-block--location venue-block">
      <h2 class="content-block__title">Tate Liverpool</h2>
    </div>
    <p>Park Seo-Bo is named only in this prose BIO_TOKEN.</p>
    <p><strong>PARK, SEO-BO Born 1931</strong> <em>Lives and works in Seoul</em><br/>
    <strong>LEE, U-FAN Born 1936</strong></p>
  `;

  it("reads a Tate roster as explicit names and does not invent a country", () => {
    const [fact] = crawl({
      url: "https://www.tate.org.uk/whats-on/tate-liverpool/working-nature-traditional-thought-contemporary-art-korea",
      html: tateHtml,
    });
    expect(fact?.pageType).toBe("EXHIBITION");
    expect(fact?.title).toBe("Working With Nature: Traditional Thought in Contemporary Art from Korea");
    expect(fact?.startYear).toBe(1992);
    expect(fact?.venue).toBe("Tate Liverpool");
    expect(fact?.city).toBe("Liverpool");
    expect(fact?.country).toBeNull();
    expect(fact?.decision).toBe("REVIEW_QUEUE");
    expect(fact?.reason).toBe("INCOMPLETE_FACT");
    expect(fact?.participants.filter((person) => person.identity === "EXACT").map((person) => person.slug)).toEqual(["park-seo-bo", "lee-ufan"]);
    expect(JSON.stringify(fact)).not.toContain("BIO_TOKEN");
    expect(trustedImportBatch([fact!], retrievedAt, snapshot())).toBeNull();
  });

  it("keeps an artist profile from becoming an exhibition and ignores promo links", async () => {
    const profile = crawl({ url: "https://www.tate.org.uk/art/artists/yun-hyong-keun-27698", html: "<h1>Yun Hyong-keun</h1>" })[0];
    expect(profile?.pageType).toBe("ARTIST_PROFILE");
    expect(profile?.reason).toBe("NO_EXHIBITION_FACT");
    expect(profile?.decision).toBe("HOLD");
    const { tateResultLinks } = await import("@/lib/history/institutionPages");
    const search = `<div class="card card--search-promo"><a href="/whats-on/tate-modern/frida-kahlo-the-making-of-an-icon"></a></div>
      <div class="card card--cluster"><div class="card__inner"><a href="/whats-on/tate-liverpool/working-nature-traditional-thought-contemporary-art-korea"></a></div></div>`;
    expect(tateResultLinks(search)).toEqual(["https://www.tate.org.uk/whats-on/tate-liverpool/working-nature-traditional-thought-contemporary-art-korea"]);
  });

  it("reads a Cleveland exhibition record without copying its description", () => {
    const [fact] = crawl({
      url: "https://openaccess-api.clevelandart.org/api/exhibitions/517759",
      json: {
        data: {
          id: 517759,
          title: "Material and Immaterial in Korean Modern and Contemporary Art",
          description: "Yun Hyong-keun BIO_TOKEN",
          opening_date: "2023-04-28T04:00:00",
          closing_date: "2024-02-25T05:00:00",
          venues: [{ name: "The Cleveland Museum of Art" }],
        },
      },
    });
    expect(fact?.pageType).toBe("EXHIBITION");
    expect(fact?.title).toBe("Material and Immaterial in Korean Modern and Contemporary Art");
    expect(fact?.startYear).toBe(2023);
    expect(fact?.endYear).toBe(2024);
    expect(fact?.venue).toBe("The Cleveland Museum of Art");
    expect(fact?.participants).toEqual([]);
    expect(fact?.decision).toBe("REVIEW_QUEUE");
    expect(fact?.reason).toBe("NO_PARTICIPANT_LIST");
    expect(JSON.stringify(fact)).not.toContain("BIO_TOKEN");
  });

  it("points an AIC exhibition at the institution page and leaves missing place fields empty", () => {
    const [fact] = crawl({
      url: "https://api.artic.edu/api/v1/exhibitions/3204",
      json: {
        data: {
          api_model: "exhibitions",
          title: "Korean Painting: Art of the Joseon Dynasty",
          aic_start_at: "2015-04-25T00:00:00-05:00",
          aic_end_at: "2015-06-28T00:00:00-05:00",
          web_url: "https://www.artic.edu/exhibitions/3204/korean-painting-art-of-the-joseon-dynasty",
          short_description: "BIO_TOKEN",
        },
      },
    });
    expect(fact?.pageType).toBe("EXHIBITION");
    expect(fact?.provenance.sourceUrl).toBe("https://www.artic.edu/exhibitions/3204/korean-painting-art-of-the-joseon-dynasty");
    expect(fact?.city).toBeNull();
    expect(fact?.country).toBeNull();
    expect(fact?.participants).toEqual([]);
    expect(fact?.reason).toBe("NO_PARTICIPANT_LIST");
    expect(JSON.stringify(fact)).not.toContain("BIO_TOKEN");
  });
});

describe("runtime env", () => {
  it("reads a quoted value and keeps the first file ahead of the next", () => {
    expect(envValueFromText("CRON_SECRET=\"present\"\nOTHER=1", "CRON_SECRET")).toBe("present");
    expect(envValue("ROB_TRUSTED_CRAWL_TEST_SECRET", ["ROB_TRUSTED_CRAWL_TEST_SECRET=from-local", "ROB_TRUSTED_CRAWL_TEST_SECRET=from-dotenv"])).toBe("from-local");
  });
});
