import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ArtistProfileV2 from "./components/ArtistProfileV2";
import { loadPublicArtist } from "@/lib/artist/loadPublicArtist";
import { historyLocale, pinnedLocale } from "@/lib/history/requestLocale";
import { languageAlternates, openGraphLocale, SITE_URL as BASE_URL } from "@/lib/seo";

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
  const record = {
    en: "Practice Record",
    ko: "작업 기록",
    ja: "制作の記録",
    "zh-Hans": "创作记录",
    "zh-Hant": "創作記錄",
  }[locale];
  const name = await getArtistName(params.artistId);
  const title = name ? `${name} | ${record} | ROB` : `${record} | ROB`;
  const description = {
    en: "A living record of artistic practice on Role of Bridge (ROB).",
    ko: "ROB에 기록된 작업의 페이지입니다.",
    ja: "ROBに記録された制作のページです。",
    "zh-Hans": "这是记录在 ROB 上的创作页面。",
    "zh-Hant": "這是記錄在 ROB 上的創作頁面。",
  }[locale];
  const alternates = languageAlternates(`/artist/public/${params.artistId}`, pinnedLocale());

  return {
    title: { absolute: title },
    description,
    alternates,
    openGraph: {
      title,
      description,
      type: "profile",
      locale: openGraphLocale(locale),
      url: alternates.canonical,
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

export default async function ArtistPublicPage({ params }: { params: { artistId: string } }) {
  const data = await loadPublicArtist(params.artistId);
  return <ArtistProfileV2 locale={historyLocale()} initialData={data} />;
}
