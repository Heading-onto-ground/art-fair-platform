import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const fallback = pageMetadata({
    title: "Exhibition | ROB",
    description: "A documented exhibition on ROB.",
    path: `/exhibitions/${params.id}`,
    index: false,
  });

  try {
    const ex = await prisma.exhibition.findFirst({
      where: { id: params.id, isPublic: true },
      select: {
        title: true,
        city: true,
        country: true,
        description: true,
        space: { select: { name: true } },
      },
    });
    // Non-public or missing exhibitions should not be indexed.
    if (!ex) return { ...fallback, robots: { index: false, follow: true } };

    const place = [ex.space?.name, ex.city, ex.country].filter(Boolean).join(", ");
    const title = place ? `${ex.title} — ${place} | ROB` : `${ex.title} | ROB`;
    return pageMetadata({
      title,
      description: ex.description || `${ex.title}${place ? ` at ${place}` : ""}.`,
      path: `/exhibitions/${params.id}`,
      type: "article",
      index: false,
    });
  } catch {
    return fallback;
  }
}

export default function ExhibitionDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
