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
    description: "A documented exhibition space on ROB.",
    path: `/spaces/${params.id}`,
    index: false,
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
      description: `${s.name}${s.type ? ` (${s.type})` : ""}${place ? ` in ${place}` : ""}.`,
      path: `/spaces/${params.id}`,
      index: false,
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
