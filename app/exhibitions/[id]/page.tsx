import type { Metadata } from "next";
import ExhibitionClient from "./ExhibitionClient";
import HistoryExhibition from "@/app/components/history/HistoryExhibition";
import { loadExhibitionPage } from "@/lib/history/queries";
import { exhibitionJsonLd, exhibitionPageTitle } from "@/lib/history/seo";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const record = await loadExhibitionPage(params.id);
    if (!record) return {};
    return pageMetadata({
      title: exhibitionPageTitle(record.title),
      description: `${record.title}. ${record.dateLabel}. ${record.artists.length} documented artists on ROB.`,
      path: `/exhibitions/${record.slug}`,
      index: record.indexEligible,
    });
  } catch {
    return {};
  }
}

export default async function ExhibitionPage({ params }: { params: { id: string } }) {
  try {
    const record = await loadExhibitionPage(params.id);
    if (record) {
      if (params.id !== record.slug) redirect(`/exhibitions/${record.slug}`);
      const json = exhibitionJsonLd({ ...record, url: `${SITE_URL}/exhibitions/${record.slug}` });
      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
          <HistoryExhibition record={record} />
        </>
      );
    }
  } catch (error) {
    if (!isMissingHistorySchema(error)) console.error("history exhibition page failed", error);
  }
  return <ExhibitionClient />;
}
