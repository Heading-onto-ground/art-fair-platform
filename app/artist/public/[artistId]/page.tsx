import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ArtistProfileV2 from "./components/ArtistProfileV2";
import { historyLocale } from "@/lib/history/requestLocale";
import { SITE_URL as BASE_URL } from "@/lib/seo";

async function getArtistName(artistId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT name, "exhibitions_public" FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1`,
      artistId
    ) as any[];
    const row = rows[0];
    return row?.exhibitions_public ? (row.name ?? null) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { artistId: string } }
): Promise<Metadata> {
  const locale = historyLocale();
  const name = await getArtistName(params.artistId);
  const title = name
    ? `${name} | ROB`
    : locale === "ko" ? "작업 기록 | ROB" : "Practice Record | ROB";
  const description = locale === "ko"
    ? "ROB에 기록된 작업의 페이지입니다."
    : "A living record of artistic practice on Role of Bridge (ROB).";
  const url = `${BASE_URL}/artist/public/${params.artistId}`;

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      images: [{ url: `${BASE_URL}/og/rob-exhibition.png` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/og/rob-exhibition.png`],
    },
  };
}

export default function ArtistPublicPage() {
  return <ArtistProfileV2 locale={historyLocale()} />;
}
