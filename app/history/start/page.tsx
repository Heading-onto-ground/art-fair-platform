import { Suspense } from "react";
import type { Metadata } from "next";
import StartHistory from "@/app/components/history/StartHistory";
import { historyCopy } from "@/lib/history/locale";
import { historyLocale } from "@/lib/history/requestLocale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = historyCopy(historyLocale());
  return {
    title: { absolute: `${copy.startKicker} | ROB` },
    robots: { index: false, follow: true },
  };
}

export default function StartHistoryPage() {
  const locale = historyLocale();
  return (
    <Suspense>
      <StartHistory locale={locale} />
    </Suspense>
  );
}
