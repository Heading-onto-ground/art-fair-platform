import type { Metadata } from "next";
import HistoryHome from "@/app/components/history/HistoryHome";
import { loadHomeDiscovery } from "@/lib/history/queries";

export const metadata: Metadata = {
  title: { absolute: "Search an artist. See their journey. | ROB" },
  description: "Search an artist and see their documented exhibition history on ROB.",
};

export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";
export const runtime = "nodejs";

export default async function HomePage() {
  let discovery = null;
  try {
    discovery = await loadHomeDiscovery();
  } catch (error) {
    console.error("home discovery failed", error);
  }
  return <HistoryHome discovery={discovery} />;
}
