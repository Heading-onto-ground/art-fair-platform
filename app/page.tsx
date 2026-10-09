import type { Metadata } from "next";
import HistoryHome from "@/app/components/history/HistoryHome";

export const metadata: Metadata = {
  title: { absolute: "Search an artist. See their journey. | ROB" },
  description: "Search an artist and see their documented exhibition history on ROB.",
};

export default function HomePage() {
  return <HistoryHome />;
}
