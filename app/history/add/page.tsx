import { Suspense } from "react";
import type { Metadata } from "next";
import AddExhibition from "@/app/components/history/AddExhibition";
import { historyCopy } from "@/lib/history/locale";
import { historyLocale } from "@/lib/history/requestLocale";

export async function generateMetadata(): Promise<Metadata> {
  const copy = historyCopy(historyLocale());
  return {
    title: { absolute: `${copy.addKicker} | ROB` },
    robots: { index: false, follow: true },
  };
}

export default function AddExhibitionPage() {
  const locale = historyLocale();
  return (
    <Suspense>
      <AddExhibition locale={locale} />
    </Suspense>
  );
}
