import { Suspense } from "react";
import type { Metadata } from "next";
import AddExhibition from "@/app/components/history/AddExhibition";

export const metadata: Metadata = {
  title: { absolute: "Add an exhibition | ROB" },
  robots: { index: false, follow: true },
};

export default function AddExhibitionPage() {
  return (
    <Suspense>
      <AddExhibition />
    </Suspense>
  );
}
