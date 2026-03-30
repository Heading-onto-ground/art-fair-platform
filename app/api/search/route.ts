import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=keyword&type=all|artist|gallery|opencall&limit=20
 *
 * PostgreSQL ILIKE 기반 전문 검색 (인덱스 추가 없이 바로 동작)
 * 추후 tsvector 인덱스로 업그레이드 가능
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") ?? "all";
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ artists: [], galleries: [], openCalls: [] });
  }

  const pattern = `%${q}%`;
  const prefixPattern = `${q}%`;

  const [artists, galleries, openCalls] = await Promise.all([
    // 아티스트 검색
    (type === "all" || type === "artist")
      ? prisma.$queryRaw<{ artistId: string; name: string; genre: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null; updatedAt: Date }[]>`
          SELECT "artistId", name, genre, country, city,
                 LEFT(bio, 120) AS bio,
                 CASE WHEN "profileImage" IS NOT NULL AND LENGTH("profileImage") < 500 THEN "profileImage" ELSE NULL END AS "profileImage",
                 "updatedAt"
          FROM "ArtistProfile"
          WHERE name ILIKE ${pattern}
             OR genre ILIKE ${pattern}
             OR bio ILIKE ${pattern}
             OR city ILIKE ${pattern}
          ORDER BY
            CASE
              WHEN LOWER(name) = LOWER(${q}) THEN 0
              WHEN name ILIKE ${prefixPattern} THEN 1
              WHEN name ILIKE ${pattern} THEN 2
              WHEN genre ILIKE ${pattern} THEN 3
              WHEN city ILIKE ${pattern} THEN 4
              ELSE 5
            END,
            "updatedAt" DESC,
            name ASC
          LIMIT ${limit}
        `
      : Promise.resolve([]),

    // 갤러리 검색
    (type === "all" || type === "gallery")
      ? prisma.$queryRaw<{ galleryId: string; name: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null; updatedAt: Date }[]>`
          SELECT "galleryId", name, country, city,
                 LEFT(bio, 120) AS bio,
                 CASE WHEN "profileImage" IS NOT NULL AND LENGTH("profileImage") < 500 THEN "profileImage" ELSE NULL END AS "profileImage",
                 "updatedAt"
          FROM "GalleryProfile"
          WHERE name ILIKE ${pattern}
             OR bio ILIKE ${pattern}
             OR city ILIKE ${pattern}
          ORDER BY
            CASE
              WHEN LOWER(name) = LOWER(${q}) THEN 0
              WHEN name ILIKE ${prefixPattern} THEN 1
              WHEN name ILIKE ${pattern} THEN 2
              WHEN city ILIKE ${pattern} THEN 3
              ELSE 4
            END,
            "updatedAt" DESC,
            name ASC
          LIMIT ${limit}
        `
      : Promise.resolve([]),

    // 오픈콜 검색
    (type === "all" || type === "opencall")
      ? prisma.$queryRaw<{ id: string; gallery: string; city: string; country: string; theme: string; deadline: string; isExternal: boolean; updatedAt: Date }[]>`
          SELECT id, gallery, city, country, theme, deadline, "isExternal", "updatedAt"
          FROM "OpenCall"
          WHERE theme ILIKE ${pattern}
             OR gallery ILIKE ${pattern}
             OR city ILIKE ${pattern}
             OR country ILIKE ${pattern}
          ORDER BY
            CASE
              WHEN LOWER(theme) = LOWER(${q}) THEN 0
              WHEN theme ILIKE ${prefixPattern} THEN 1
              WHEN theme ILIKE ${pattern} THEN 2
              WHEN gallery ILIKE ${pattern} THEN 3
              WHEN city ILIKE ${pattern} OR country ILIKE ${pattern} THEN 4
              ELSE 5
            END,
            "updatedAt" DESC
          LIMIT ${limit}
        `
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ artists, galleries, openCalls, query: q });
}
