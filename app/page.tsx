import type { Metadata } from "next";
import HistoryHome from "@/app/components/history/HistoryHome";
import { historyCopy } from "@/lib/history/locale";
import { loadHomeDiscovery } from "@/lib/history/queries";
import { historyLocale } from "@/lib/history/requestLocale";

export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const copy = historyCopy(historyLocale());
  return {
    title: { absolute: copy.pageTitle },
    description: copy.pageDescription,
  };
}

export default async function HomePage() {
  const locale = historyLocale();
  let discovery = null;
  try {
    discovery = await loadHomeDiscovery();
  } catch (error) {
    console.error("home discovery failed", error);
  }
  return <HistoryHome discovery={discovery} locale={locale} />;
}
