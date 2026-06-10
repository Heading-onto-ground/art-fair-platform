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
    description:
      "Explore exhibitions and the artists behind them on ROB — Role of Bridge, a global art platform.",
    path: `/exhibitions/${params.id}`,
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
      description:
        ex.description ||
        `${ex.title}${place ? ` at ${place}` : ""} — exhibition details on ROB, a global art platform.`,
      path: `/exhibitions/${params.id}`,
      type: "article",
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
