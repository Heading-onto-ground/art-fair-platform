import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ExhibitionClient from "./ExhibitionClient";
import HistoryExhibition from "@/app/components/history/HistoryExhibition";
import { loadExhibitionPage } from "@/lib/history/queries";
import { breadcrumbJsonLd, exhibitionJsonLd, exhibitionPageTitle } from "@/lib/history/seo";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { historyLocale, pinnedLocale, pinnedPath } from "@/lib/history/requestLocale";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const record = await loadExhibitionPage(params.id);
    if (!record) return {};
    const locale = historyLocale();
    return pageMetadata({
      title: exhibitionPageTitle(record.title),
      description: locale === "ko"
        ? `${record.title}. ${record.dateLabel}. 기록된 작가 ${record.artists.length}명.`
        : `${record.title}. ${record.dateLabel}. ${record.artists.length} documented artists on ROB.`,
      path: `/exhibitions/${record.slug}`,
      index: record.indexEligible,
      localeUrl: pinnedLocale(),
    });
  } catch {
    return {};
  }
}

export default async function ExhibitionPage({ params }: { params: { id: string } }) {
  const locale = historyLocale();
  try {
    const record = await loadExhibitionPage(params.id);
    if (record) {
      if (params.id !== record.slug) redirect(pinnedPath(`/exhibitions/${record.slug}`));
      const path = pinnedPath(`/exhibitions/${record.slug}`);
      const json = exhibitionJsonLd({ ...record, url: `${SITE_URL}${path}` });
      const crumbs = breadcrumbJsonLd([
        { name: "ROB", path: pinnedPath("/") },
        { name: record.title, path },
      ], SITE_URL);
      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
          <HistoryExhibition record={record} locale={locale} />
        </>
      );
    }
  } catch (error) {
    if (!isMissingHistorySchema(error)) console.error("history exhibition page failed", error);
  }
  return <ExhibitionClient />;
}
