import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const fallback = pageMetadata({
    title: "Artist | ROB",
    description:
      "Discover artists and their practice records on ROB — Role of Bridge, a global art platform.",
    path: `/artists/${params.id}`,
  });

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
      description:
        a.bio ||
        `${a.name}${descr ? ` (${descr})` : ""} — view this artist's profile and work on ROB, a global art platform.`,
      path: `/artists/${params.id}`,
      image: a.profileImage,
      type: "profile",
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
