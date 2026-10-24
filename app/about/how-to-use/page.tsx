import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import GuideView from "@/app/components/history/GuideView";
import { historyLocale } from "@/lib/history/requestLocale";
import { pageMetadata } from "@/lib/seo";
import "@/app/components/history/history.css";

export function generateMetadata() {
  const ko = historyLocale() === "ko";
  return pageMetadata({
    title: ko ? "ROB 사용법 | ROB" : "How to use ROB | ROB",
    description: ko
      ? "작가를 검색하고, 확인된 전시를 따라, 같은 기록에 있는 다른 작가로 넘어갑니다."
      : "Search an artist, follow documented exhibitions, and cross into another artist through a sourced record.",
    path: "/about/how-to-use",
  });
}

export default function HowToUsePage() {
  const locale = historyLocale();
  return (
    <div className="rh-page">
      <TopBar locale={locale} />
      <main className="rh-wrap" id="main-content">
        <GuideView locale={locale} />
        <p><Link href="/about/why-rob">{locale === "ko" ? "ROB 소개" : "Why ROB"}</Link></p>
      </main>
    </div>
  );
}
