import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";
import { loadPublicArtist } from "@/lib/history/queries";
import { artistPageDescription, artistPageTitle } from "@/lib/history/seo";
import { historyLocale, pinnedLocale } from "@/lib/history/requestLocale";

export const preferredRegion = "bom1";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const locale = historyLocale();
  const localeUrl = pinnedLocale();
  const fallback = pageMetadata({
    title: locale === "ko" ? "작가 | ROB" : "Artist | ROB",
    description: locale === "ko"
      ? "ROB에 기록된 작가의 전시 이력입니다."
      : "A documented artist history on ROB.",
    path: `/artists/${params.id}`,
    index: false,
    localeUrl,
  });

  try {
    const loaded = await loadPublicArtist(params.id);
    if (loaded.kind === "history" || loaded.kind === "redirect") {
      return pageMetadata({
        title: artistPageTitle(loaded.artist, locale),
        description: artistPageDescription(loaded.artist, locale),
        path: `/artists/${loaded.artist.slug}`,
        index: loaded.artist.indexEligible,
        type: "profile",
        localeUrl,
      });
    }
  } catch {
    // History tables may not be applied yet. Fall through to the account profile.
  }

  try {
    const a = await prisma.artistProfile.findFirst({
      where: { userId: params.id },
      select: {
        name: true,
        genre: true,
        city: true,
        country: true,
        bio: true,
        profileImage: true,
      },
    });
    if (!a) return fallback;

    const place = [a.city, a.country].filter(Boolean).join(", ");
    const descr = [a.genre, place].filter(Boolean).join(" · ");
    const title = descr ? `${a.name} — ${descr} | ROB` : `${a.name} | ROB`;
    return pageMetadata({
      title,
      description: a.bio || `${a.name}${descr ? ` (${descr})` : ""}.`,
      path: `/artists/${params.id}`,
      image: a.profileImage,
      type: "profile",
      index: false,
      localeUrl,
    });
  } catch {
    return fallback;
  }
}

export default function ArtistDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
