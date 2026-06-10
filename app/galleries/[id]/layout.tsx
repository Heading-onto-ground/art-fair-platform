import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const fallback = pageMetadata({
    title: "Gallery | ROB",
    description:
      "Discover galleries and their open calls on ROB — Role of Bridge, a global art platform.",
    path: `/galleries/${params.id}`,
  });

  try {
    const g = await prisma.galleryProfile.findFirst({
      where: { userId: params.id },
      select: { name: true, city: true, country: true, bio: true, profileImage: true },
    });
    if (!g) return fallback;

    const place = [g.city, g.country].filter(Boolean).join(", ");
    const title = place ? `${g.name} — ${place} | ROB` : `${g.name} | ROB`;
    return pageMetadata({
      title,
      description:
        g.bio ||
        `${g.name}${place ? ` in ${place}` : ""} — view this gallery's profile and open calls on ROB, a global art platform.`,
      path: `/galleries/${params.id}`,
      image: g.profileImage,
      type: "profile",
    });
  } catch {
    return fallback;
  }
}

export default function GalleryDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
