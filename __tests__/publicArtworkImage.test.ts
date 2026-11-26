import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artwork: { findFirst: (...args: unknown[]) => findFirst(...args) },
  },
}));

import { GET } from "@/app/api/public-artwork/[id]/image/route";

const JPEG = "data:image/jpeg;base64,QQ==";

function artwork(id: string, isPublic: boolean, inPortfolio: boolean, images: { url: string }[] = []) {
  return { id, isPublic, inPortfolio, imageUrl: images.length > 0 ? "" : JPEG, images };
}

const catalog = [
  artwork("public-portfolio", true, true),
  artwork("public-only", true, false),
  artwork("private-portfolio", false, true),
  artwork("private-only", false, false),
  artwork("other-artist-private", false, true),
  artwork("images-only", true, false, [ { url: JPEG }, { url: "data:image/png;base64,QQ==" } ]),
];

describe("public artwork image access", () => {
  beforeEach(() => {
    findFirst.mockImplementation(async (args: { where: { id: string; isPublic: boolean } }) => {
      const row = catalog.find((item) => item.id === args.where.id);
      if (!row || args.where.isPublic !== true || row.isPublic !== true) return null;
      return { imageUrl: row.imageUrl, images: row.images };
    });
  });

  async function get(id: string, index?: string) {
    const query = index === undefined ? "" : `?i=${index}`;
    return GET(new Request(`https://rob.example/api/public-artwork/${id}/image${query}`), { params: { id } });
  }

  it("serves a public portfolio work and a public work that is not in the portfolio", async () => {
    for (const id of ["public-portfolio", "public-only"]) {
      const response = await get(id);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/jpeg");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  });

  it("blocks private works even when they are marked for the portfolio", async () => {
    for (const id of ["private-portfolio", "private-only", "other-artist-private"]) {
      const response = await get(id);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  });

  it("blocks a missing id and a malformed id", async () => {
    for (const id of ["missing", "../secret", " "]) {
      const response = await get(id);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  });

  it("serves every public ArtworkImage, including a work whose only file is not the cover column", async () => {
    const cover = await get("images-only");
    const second = await get("images-only", "1");
    const missing = await get("images-only", "2");
    const malformed = await get("images-only", "no");
    expect(cover.status).toBe(200);
    expect(cover.headers.get("content-type")).toBe("image/jpeg");
    expect(second.status).toBe(200);
    expect(second.headers.get("content-type")).toBe("image/png");
    expect(second.headers.get("cache-control")).toBe("private, no-store");
    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(404);
  });

  it("asks the database only for public works, so a later privacy change is not served from a public cache", async () => {
    await get("public-portfolio");
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "public-portfolio", isPublic: true },
    }));
    const cached = await get("public-portfolio");
    expect(cached.headers.get("cache-control")).not.toContain("public");
    expect(cached.headers.get("cache-control")).not.toContain("max-age=86400");
  });
});
