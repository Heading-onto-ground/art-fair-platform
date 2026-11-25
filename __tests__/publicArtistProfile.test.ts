import { describe, expect, it } from "vitest";
import {
  displayCountry,
  portfolioArtworks,
  practiceLine,
  publicArtworkImagePaths,
  publicImageSources,
  seriesCoverImage,
  type PublicArtworkRecord,
} from "@/lib/artist/publicProfile";

const works: PublicArtworkRecord[] = [
  { id: "public-only", seriesId: "series-a", imageUrl: "public.jpg", isPublic: true, inPortfolio: false },
  { id: "selected", seriesId: "series-b", imageUrl: "selected.jpg", isPublic: true, inPortfolio: true },
  { id: "private", seriesId: "series-a", imageUrl: "private.jpg", isPublic: false, inPortfolio: true },
  { id: "selected-same-series", seriesId: "series-a", imageUrl: "chosen.jpg", isPublic: true, inPortfolio: true },
];

describe("public artist portfolio policy", () => {
  it("keeps portfolio selection separate from public visibility", () => {
    expect(portfolioArtworks(works).map((work) => work.id)).toEqual(["selected", "selected-same-series"]);
  });

  it("uses a public series image without putting that work into the portfolio", () => {
    const onlyPublic = works.filter((work) => work.id === "public-only");
    expect(seriesCoverImage("series-a", onlyPublic)).toBe("public.jpg");
    expect(portfolioArtworks(onlyPublic)).toEqual([]);
  });

  it("prefers the artist's portfolio choice as the series cover and hides private images", () => {
    expect(seriesCoverImage("series-a", works)).toBe("chosen.jpg");
    expect(seriesCoverImage("series-b", works)).toBe("selected.jpg");
    expect(seriesCoverImage("missing", works)).toBeNull();
  });

  it("lists a path for every stored image without embedding the file", () => {
    expect(publicImageSources("", [{ url: "data:image/jpeg;base64,QQ==" }, { url: "second" }])).toEqual([
      "data:image/jpeg;base64,QQ==",
      "second",
    ]);
    expect(publicImageSources("cover-only", [])).toEqual(["cover-only"]);
    expect(publicArtworkImagePaths("work", 2)).toEqual([
      "/api/public-artwork/work/image",
      "/api/public-artwork/work/image?i=1",
    ]);
    expect(publicArtworkImagePaths("work", 2).join(" ")).not.toContain("data:");
  });

  it("shows South Korea in English and leaves the stored Korean value on a Korean page", () => {
    expect(displayCountry("한국", "en")).toBe("South Korea");
    expect(displayCountry("한국", "ko")).toBe("한국");
    expect(practiceLine({ city: "seoul", country: "한국", startedYear: 2019, locale: "en" })).toBe(
      "Seoul, South Korea · Since 2019",
    );
    expect(practiceLine({ city: "seoul", country: "한국", startedYear: 2019, locale: "ko" })).toBe(
      "Seoul, 한국 · 2019년부터",
    );
  });
});
