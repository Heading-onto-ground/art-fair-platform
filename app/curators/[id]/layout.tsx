import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const fallback = pageMetadata({
    title: "Curator | ROB",
    description:
      "Discover curators and the exhibitions they shape on ROB — Role of Bridge, a global art platform.",
    path: `/curators/${params.id}`,
  });

  try {
    const c = await prisma.curator.findUnique({
      where: { id: params.id },
      select: { name: true, organization: true, bio: true },
    });
    if (!c) return fallback;

    const title = c.organization
      ? `${c.name} — ${c.organization} | ROB`
      : `${c.name} | ROB`;
    return pageMetadata({
      title,
      description:
        c.bio ||
        `${c.name}${c.organization ? ` (${c.organization})` : ""} — curator profile and exhibitions on ROB, a global art platform.`,
      path: `/curators/${params.id}`,
      type: "profile",
    });
  } catch {
    return fallback;
  }
}

export default function CuratorDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
