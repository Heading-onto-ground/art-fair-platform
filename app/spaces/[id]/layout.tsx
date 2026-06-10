import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const fallback = pageMetadata({
    title: "Exhibition Space | ROB",
    description:
      "Explore exhibition spaces and venues on ROB — Role of Bridge, a global art platform.",
    path: `/spaces/${params.id}`,
  });

  try {
    const s = await prisma.space.findUnique({
      where: { id: params.id },
      select: { name: true, type: true, city: true, country: true },
    });
    if (!s) return fallback;

    const place = [s.city, s.country].filter(Boolean).join(", ");
    const title = place ? `${s.name} — ${place} | ROB` : `${s.name} | ROB`;
    return pageMetadata({
      title,
      description: `${s.name}${s.type ? ` (${s.type})` : ""}${
        place ? ` in ${place}` : ""
      } — exhibitions and details on ROB, a global art platform.`,
      path: `/spaces/${params.id}`,
    });
  } catch {
    return fallback;
  }
}

export default function SpaceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
