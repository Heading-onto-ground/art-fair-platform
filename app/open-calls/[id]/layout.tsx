import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const fallback = pageMetadata({
    title: "Open Call | ROB",
    description:
      "Browse open calls from galleries worldwide and apply to exhibitions through ROB — Role of Bridge.",
    path: `/open-calls/${params.id}`,
  });

  try {
    const oc = await prisma.openCall.findUnique({
      where: { id: params.id },
      select: {
        gallery: true,
        theme: true,
        city: true,
        country: true,
        deadline: true,
        galleryDescription: true,
        posterImage: true,
      },
    });
    if (!oc) return fallback;

    const place = [oc.city, oc.country].filter(Boolean).join(", ");
    const title = `${oc.theme} — Open Call by ${oc.gallery} | ROB`;
    const description =
      oc.galleryDescription ||
      `${oc.gallery}${place ? ` (${place})` : ""} is calling for artists: "${oc.theme}".${
        oc.deadline ? ` Deadline ${oc.deadline}.` : ""
      } Apply through ROB.`;
    return pageMetadata({
      title,
      description,
      path: `/open-calls/${params.id}`,
      image: oc.posterImage,
      type: "article",
    });
  } catch {
    return fallback;
  }
}

export default function OpenCallDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
