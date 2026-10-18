import { describe, expect, it } from "vitest";
import type { GrowthSnapshot } from "@/lib/history/growth";
import { aliasSitemapUrls, exactDirectoryLinks, galleryChronologyRows, textHasExactAlias } from "@/lib/history/galleryChronology";
import { crawlArtists, crawlTrustedPage } from "@/lib/history/trustedCrawl";

const retrievedAt = "2026-10-17";
const artists = crawlArtists([{ slug: "lee-seung-jio", labels: ["Lee Seung Jio", "이승조"] }]);

const chronology = `
  <h2>Lee Seung Jio</h2>
  <h4 class="biography__title">Biography</h4>
  <ul><li><span class="biography__text">1984&nbsp; MFA in Painting, Hongik University, Seoul, Korea<br />1965 BFA in Painting, Hongik University, Seoul, Korea</span></li></ul>
  <h4 class="biography__title">Selected Solo Exhibitions</h4>
  <ul><li><span class="biography__text">2025<br /> <em>Lee Seung Jio: Nucleus in Resonance, </em>Tina Kim Gallery, New York, USA<br /> 2022<br /> <em>Lee Seung Jio,&nbsp;</em>Kukje Gallery, Seoul, Korea<br /> 2000<br /> Busan Museum of Art, Busan, Korea</span></li></ul>
  <h4 class="biography__title">Selected Group Exhibitions</h4>
  <ul><li><span>2025<br /> <em>Painting. Traces of Intersected Eras, </em>Museum Hodu, Cheonan, Korea</span></li></ul>
  <h4 class="biography__title">Selected Press</h4>
  <p><em>A review essay, </em>Artforum, New York, USA</p>
`;

function crawl(html: string, exhibitions: GrowthSnapshot["exhibitions"] = []) {
  const snapshot: GrowthSnapshot = {
    artists: artists.map((artist) => ({ ...artist, exhibitionIds: exhibitions.map((exhibition) => exhibition.id) })),
    exhibitions,
    unresolved: [],
  };
  return crawlTrustedPage({
    url: "https://www.kukjegallery.com/artists/view?seq=413",
    retrievedAt,
    html,
    artists,
    snapshot,
    snapshotReady: true,
  });
}

describe("gallery chronology", () => {
  it("reads dated exhibition rows and skips biography, untitled lines, and press", () => {
    expect(galleryChronologyRows(chronology).map((row) => row.title)).toEqual([
      "Lee Seung Jio: Nucleus in Resonance",
      "Lee Seung Jio",
      "Painting. Traces of Intersected Eras",
    ]);
    expect(JSON.stringify(galleryChronologyRows(chronology))).not.toContain("MFA");
    expect(JSON.stringify(galleryChronologyRows(chronology))).not.toContain("Artforum");
    expect(JSON.stringify(galleryChronologyRows(chronology))).not.toContain("Busan Museum");
  });

  it("attributes a solo row to the named artist and keeps an already recorded show exact", () => {
    const facts = crawl(chronology, [{
      id: "existing",
      title: "LEE SEUNG JIO",
      year: 2022,
      space: "Kukje Gallery",
      city: "Seoul",
      artistSlugs: ["lee-seung-jio"],
    }]);
    const nucleus = facts.find((fact) => fact.title === "Lee Seung Jio: Nucleus in Resonance");
    const recorded = facts.find((fact) => fact.startYear === 2022 && fact.venue === "Kukje Gallery");
    expect(nucleus?.decision).toBe("AUTO_IMPORT");
    expect(nucleus?.duplicate).toBe("NEW");
    expect(nucleus?.country).toBe("USA");
    expect(nucleus?.city).toBe("New York");
    expect(nucleus?.participants).toEqual([
      expect.objectContaining({ slug: "lee-seung-jio", evidence: "EXPLICIT_PARTICIPANT", identity: "EXACT" }),
    ]);
    expect(recorded?.duplicate).toBe("EXACT");
    expect(facts.some((fact) => fact.title === "A review essay")).toBe(false);
  });

  it("follows the page heading and does not invent an unlisted subject", () => {
    const other = crawl(chronology.replace("<h2>Lee Seung Jio</h2>", "<h2>Park Seo-Bo</h2>"));
    expect(other.every((fact) => fact.participants.every((person) => person.slug !== "lee-seung-jio"))).toBe(true);
    const [unlisted] = crawl(chronology.replace("<h2>Lee Seung Jio</h2>", "<h2>Not A Listed Artist</h2>"));
    expect(unlisted?.reason).toBe("CHRONOLOGY_UNATTRIBUTED");
    expect(unlisted?.participants).toEqual([]);
  });

  it("matches a directory link by the whole alias and ignores a nearby name", () => {
    const html = `
      <a href="/artists/view?seq=413">Lee Seung Jio 이승조</a>
      <a href="/artists/view?seq=10">Choong-Hyun Roh</a>
      <a href="https://example.com/artists/view?seq=413">Lee Seung Jio</a>
    `;
    expect(exactDirectoryLinks(html, ["Lee Seung Jio", "이승조"], "https://www.kukjegallery.com/artists")).toEqual([
      "https://www.kukjegallery.com/artists/view?seq=413",
    ]);
    expect(textHasExactAlias("Choong-Hyun Roh", "Park Hyun-Ki")).toBe(false);
  });

  it("keeps only sitemap urls that contain an exact alias", () => {
    const xml = `
      <urlset>
        <url><loc>https://www.galleryhyundai.com/artist/lee-seung-jio</loc></url>
        <url><loc>https://www.galleryhyundai.com/exhibition/archive</loc></url>
      </urlset>
    `;
    expect(aliasSitemapUrls(xml, ["Lee Seung Jio"])).toEqual(["https://www.galleryhyundai.com/artist/lee-seung-jio"]);
  });
});
