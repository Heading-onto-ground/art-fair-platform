import { describe, expect, it } from "vitest";
import { aliasLookupEqual, aliasLookupPrefix, mayRelinkUnresolvedName, normalizeArtistLookup, resolveArtistSlug, resolveVerifiedAlias } from "@/lib/history/identity";
import { buildDocumentedPaths } from "@/lib/history/paths";

describe("artist identity lookup", () => {
  it("treats verified hyphen and spacing variants as the same artist", () => {
    expect(normalizeArtistLookup("Lee U-Fan")).toBe("lee u fan");
    expect(normalizeArtistLookup("Lee U Fan")).toBe("lee u fan");
    expect(aliasLookupEqual("Lee U-Fan", "Lee U Fan")).toBe(true);
    expect(resolveVerifiedAlias("Lee U Fan")).toBe("lee-ufan");
    expect(resolveVerifiedAlias("Chung Sang Hwa")).toBe("chung-sang-hwa");
    expect(resolveVerifiedAlias("Park Seobo")).toBe("park-seo-bo");
    expect(resolveVerifiedAlias("Ha Chonghyun")).toBe("ha-chong-hyun");
    expect(resolveVerifiedAlias("Yun Hyongkeun")).toBe("yun-hyong-keun");
    expect(resolveVerifiedAlias("Yun Hyong-Keun")).toBe("yun-hyong-keun");
    expect(resolveVerifiedAlias("Kim Tschang-yeul")).toBe("kim-tschang-yeul");
    expect(resolveVerifiedAlias("Kim Tschangyeul")).toBe("kim-tschang-yeul");
  });

  it("does not merge unverified spellings", () => {
    expect(resolveVerifiedAlias("Chung Chang-Sub")).toBe("chung-chang-sup");
    expect(aliasLookupEqual("Chung Chang-Sup", "Chung Chang-Sub")).toBe(false);
    expect(resolveVerifiedAlias("Kim, Guirin")).toBeNull();
    expect(resolveVerifiedAlias("Park, Seo-Bo")).toBeNull();
    expect(resolveVerifiedAlias("Kim Guiline")).toBe("kim-guiline");
    expect(resolveVerifiedAlias("김기린")).toBe("kim-guiline");
  });

  it("does not match a shorter name by deleting letters", () => {
    expect(resolveVerifiedAlias("Lee Fan")).toBeNull();
    expect(aliasLookupPrefix("Lee Fan", "Lee Ufan")).toBe(false);
    expect(aliasLookupPrefix("Lee U", "Lee Ufan")).toBe(true);
    expect(aliasLookupEqual("Lee Ufan", "Lee U Fan")).toBe(false);
  });

  it("does not relink letter authors as exhibition participants", () => {
    expect(mayRelinkUnresolvedName("The Making of Modern Korean Art: The Letters of Kim Tschang-Yeul, Kim Whanki, Lee Ufan, and Park Seo-Bo, 1961-1982")).toBe(false);
    expect(mayRelinkUnresolvedName("Kim Tschang-Yeul + Park Seo-Bo + Lee Ufan")).toBe(true);
  });

  it("resolves a database alias without creating another artist", () => {
    const names = [{ slug: "lee-ufan", labels: ["Lee Ufan", "이우환", "Lee U Fan"] }];
    expect(resolveArtistSlug("Lee U-Fan", names)).toBe("lee-ufan");
    expect(resolveArtistSlug("Lee Fan", names)).toBeNull();
  });
});

describe("documented paths", () => {
  it("chains two shared exhibitions into three artists", () => {
    const paths = buildDocumentedPaths([
      {
        id: "mainz",
        slug: "mainz",
        title: "Das Koreanische Monochrom",
        year: 2005,
        artists: [
          { slug: "park-seo-bo", name: "Park Seo-Bo" },
          { slug: "lee-ufan", name: "Lee Ufan" },
        ],
      },
      {
        id: "ingong",
        slug: "ingong",
        title: "Ingong Gallery",
        year: 1992,
        artists: [
          { slug: "park-seo-bo", name: "Park Seo-Bo" },
          { slug: "ha-chong-hyun", name: "Ha Chong-Hyun" },
          { slug: "chung-sang-hwa", name: "Chung Sang-Hwa" },
        ],
      },
    ]);
    expect(paths.some((path) => path.artists.map((artist) => artist.slug).join(">") === "ha-chong-hyun>park-seo-bo>lee-ufan")).toBe(true);
    expect(paths.every((path) => new Set(path.artists.map((artist) => artist.slug)).size === path.artists.length)).toBe(true);
    expect(paths.every((path) => new Set(path.exhibitions.map((show) => show.slug)).size === path.exhibitions.length)).toBe(true);
  });
});
