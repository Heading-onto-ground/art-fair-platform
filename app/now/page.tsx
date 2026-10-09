import type { Metadata } from "next";
import NowPage from "@/app/components/NowPage";

export const metadata: Metadata = {
  title: { absolute: "Now | ROB" },
  robots: { index: false, follow: true },
};

export default function NowRoute() {
  return <NowPage />;
}
