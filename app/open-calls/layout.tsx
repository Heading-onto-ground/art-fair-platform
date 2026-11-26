import type { Metadata } from "next";
import { historyLocale } from "@/lib/history/requestLocale";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const ko = historyLocale() === "ko";
  return pageMetadata({
    title: ko ? "전시·공모 오픈콜 | ROB" : "Exhibition and open-call opportunities | ROB",
    description: ko
      ? "작가가 전시·공모의 마감, 지원 자격, 주최, 확인된 비용을 비교하고 지원 경로를 확인하는 오픈콜 목록입니다."
      : "Compare exhibition and open-call deadlines, eligibility, organizers, and confirmed costs, then open the application path.",
    path: "/open-calls",
  });
}

export default function OpenCallsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
