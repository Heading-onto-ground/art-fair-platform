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
      "전시·공모 공고의 마감, 지원 자격, 비용을 확인하고 지원 경로로 이동합니다.",
    path: `/open-calls/${params.id}`,
  });

  try {
    const oc = await prisma.openCall.findUnique({
      where: { id: params.id },
      select: {
        gallery: true,
        theme: true,
        deadline: true,
        isExternal: true,
        posterImage: true,
      },
    });
    if (!oc) return fallback;

    const name = oc.gallery || oc.theme;
    const title = `${name} | ROB`;
    const deadline = oc.deadline ? `마감 ${oc.deadline}.` : "마감 미확인.";
    const description = oc.isExternal
      ? `${name} 공고. ${deadline} 지원 자격과 비용은 확인된 항목만 표시합니다. 접수는 ROB이 아닌 주최 또는 원문 페이지에서 진행합니다.`
      : `${name} 공고. ${deadline} 조건을 확인한 뒤 ROB에서 지원서를 제출할 수 있습니다.`;
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
