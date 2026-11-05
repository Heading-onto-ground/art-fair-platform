import type { Metadata } from "next";
import HistoryHome from "@/app/components/history/HistoryHome";
import { historyCopy } from "@/lib/history/locale";
import { websiteJsonLd } from "@/lib/history/seo";
import { loadHomeDiscovery } from "@/lib/history/queries";
import { historyLocale, pinnedLocale, pinnedPath } from "@/lib/history/requestLocale";
import { pageMetadata, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const copy = historyCopy(historyLocale());
  return pageMetadata({
    title: copy.pageTitle,
    description: copy.pageDescription,
    path: "/",
    localeUrl: pinnedLocale(),
  });
}

export default async function HomePage() {
  const locale = historyLocale();
  let discovery = null;
  try {
    discovery = await loadHomeDiscovery();
  } catch (error) {
    console.error("home discovery failed", error);
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd(`${SITE_URL}${pinnedPath("/")}`)) }} />
      <HistoryHome discovery={discovery} locale={locale} />
    </>
  );
}
