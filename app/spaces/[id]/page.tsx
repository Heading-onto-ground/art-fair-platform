import type { Metadata } from "next";
import SpaceClient from "./SpaceClient";
import HistorySpace from "@/app/components/history/HistorySpace";
import { loadSpacePage } from "@/lib/history/queries";
import { spaceJsonLd, spacePageTitle } from "@/lib/history/seo";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { pageMetadata, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const record = await loadSpacePage(params.id);
    if (!record) return {};
    return pageMetadata({
      title: spacePageTitle(record.name),
      description: `${record.name}. ${record.exhibitions.length} documented exhibitions on ROB.`,
      path: `/spaces/${record.slug}`,
      index: record.indexEligible,
    });
  } catch {
    return {};
  }
}

export default async function SpacePage({ params }: { params: { id: string } }) {
  try {
    const record = await loadSpacePage(params.id);
    if (record) {
      const json = spaceJsonLd({ ...record, url: `${SITE_URL}/spaces/${record.slug}` });
      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
          <HistorySpace record={record} />
        </>
      );
    }
  } catch (error) {
    if (!isMissingHistorySchema(error)) console.error("history space page failed", error);
  }
  return <SpaceClient />;
}
