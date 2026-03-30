import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function buildSearchVariants(input: string): string[] {
  const q = String(input || "").trim();
  if (!q) return [];
  const lower = q.toLowerCase();

  const synonymMap: Record<string, string[]> = {
    artist: ["작가", "アーティスト"],
    "작가": ["artist", "アーティスト"],
    "アーティスト": ["artist", "작가"],
    gallery: ["갤러리", "ギャラリー"],
    "갤러리": ["gallery", "ギャラリー"],
    "ギャラリー": ["gallery", "갤러리"],
    curator: ["큐레이터", "キュレーター"],
    "큐레이터": ["curator", "キュレーター"],
    open: ["오픈콜", "オープンコール"],
    "오픈콜": ["open call", "オープンコール"],
    "オープンコール": ["open call", "오픈콜"],
    painting: ["회화", "絵画"],
    "회화": ["painting", "絵画"],
    "絵画": ["painting", "회화"],
    sculpture: ["조각", "彫刻"],
    "조각": ["sculpture", "彫刻"],
    photography: ["사진", "写真"],
    "사진": ["photography", "写真"],
    digital: ["디지털", "デジタル"],
    "디지털": ["digital", "デジタル"],
    korea: ["한국", "대한민국", "south korea"],
    "한국": ["korea", "south korea", "대한민국"],
    japan: ["일본", "日本"],
    "일본": ["japan", "日本"],
  };

  const variants = new Set<string>([q]);
  if (synonymMap[lower]) {
    for (const s of synonymMap[lower]) variants.add(s);
  }
  return Array.from(variants).filter((v) => v.trim().length >= 2).slice(0, 6);
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string, limit: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const k = keyFn(row);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

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

  const variants = buildSearchVariants(q);

  const [artists, galleries, openCalls] = await Promise.all([
    (async () => {
      if (!(type === "all" || type === "artist")) return [];
      const collected: Array<{ artistId: string; name: string; genre: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null; updatedAt: Date }> = [];
      for (const term of variants) {
        const pattern = `%${term}%`;
        const prefixPattern = `${term}%`;
        const rows = await prisma.$queryRaw<{ artistId: string; name: string; genre: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null; updatedAt: Date }[]>`
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
              WHEN LOWER(name) = LOWER(${term}) THEN 0
              WHEN name ILIKE ${prefixPattern} THEN 1
              WHEN name ILIKE ${pattern} THEN 2
              WHEN genre ILIKE ${pattern} THEN 3
              WHEN city ILIKE ${pattern} THEN 4
              ELSE 5
            END,
            "updatedAt" DESC,
            name ASC
          LIMIT ${limit}
        `;
        collected.push(...rows);
      }
      return dedupeBy(collected, (r) => r.artistId, limit);
    })(),
    (async () => {
      if (!(type === "all" || type === "gallery")) return [];
      const collected: Array<{ galleryId: string; name: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null; updatedAt: Date }> = [];
      for (const term of variants) {
        const pattern = `%${term}%`;
        const prefixPattern = `${term}%`;
        const rows = await prisma.$queryRaw<{ galleryId: string; name: string; country: string | null; city: string | null; bio: string | null; profileImage: string | null; updatedAt: Date }[]>`
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
              WHEN LOWER(name) = LOWER(${term}) THEN 0
              WHEN name ILIKE ${prefixPattern} THEN 1
              WHEN name ILIKE ${pattern} THEN 2
              WHEN city ILIKE ${pattern} THEN 3
              ELSE 4
            END,
            "updatedAt" DESC,
            name ASC
          LIMIT ${limit}
        `;
        collected.push(...rows);
      }
      return dedupeBy(collected, (r) => r.galleryId, limit);
    })(),
    (async () => {
      if (!(type === "all" || type === "opencall")) return [];
      const collected: Array<{ id: string; gallery: string; city: string; country: string; theme: string; deadline: string; isExternal: boolean; updatedAt: Date }> = [];
      for (const term of variants) {
        const pattern = `%${term}%`;
        const prefixPattern = `${term}%`;
        const rows = await prisma.$queryRaw<{ id: string; gallery: string; city: string; country: string; theme: string; deadline: string; isExternal: boolean; updatedAt: Date }[]>`
          SELECT id, gallery, city, country, theme, deadline, "isExternal", "updatedAt"
          FROM "OpenCall"
          WHERE theme ILIKE ${pattern}
             OR gallery ILIKE ${pattern}
             OR city ILIKE ${pattern}
             OR country ILIKE ${pattern}
          ORDER BY
            CASE
              WHEN LOWER(theme) = LOWER(${term}) THEN 0
              WHEN theme ILIKE ${prefixPattern} THEN 1
              WHEN theme ILIKE ${pattern} THEN 2
              WHEN gallery ILIKE ${pattern} THEN 3
              WHEN city ILIKE ${pattern} OR country ILIKE ${pattern} THEN 4
              ELSE 5
            END,
            "updatedAt" DESC
          LIMIT ${limit}
        `;
        collected.push(...rows);
      }
      return dedupeBy(collected, (r) => r.id, limit);
    })(),
  ]);

  return NextResponse.json({ artists, galleries, openCalls, query: q, variants });
}
