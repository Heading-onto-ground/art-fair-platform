import { Suspense } from "react";
import type { Metadata } from "next";
import StartHistory from "@/app/components/history/StartHistory";

export const metadata: Metadata = {
  title: { absolute: "Start your history | ROB" },
  robots: { index: false, follow: true },
};

export default function StartHistoryPage() {
  return (
    <Suspense>
      <StartHistory />
    </Suspense>
  );
}
