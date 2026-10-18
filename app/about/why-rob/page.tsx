import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import PromoSearch, { PromoCtas } from "@/app/components/history/PromoSearch";
import { EXAMPLE_ARTISTS } from "@/lib/publicGrowth/examplePath";
import { historyLocale } from "@/lib/history/requestLocale";
import { pageMetadata } from "@/lib/seo";
import "@/app/components/history/history.css";

export function generateMetadata() {
  const ko = historyLocale() === "ko";
  return pageMetadata({
    title: ko ? "ROB 소개 | ROB" : "Why ROB | ROB",
    description: ko
      ? "작가를 검색하세요. 그 작가의 세계로 들어갑니다. ROB는 확인된 전시와 그 접점을 보여 줍니다."
      : "Search an artist. Enter their world. ROB shows documented exhibitions and the people and places connected through them.",
    path: "/about/why-rob",
  });
}

export default function WhyRobPage() {
  const locale = historyLocale();
  const ko = locale === "ko";
  return (
    <div className="rh-page">
      <TopBar locale={locale} />
      <main className="rh-wrap rh-prose" id="main-content">
        <h1 className="rh-title">{ko ? "작가를 검색하세요." : "Search an artist."}</h1>
        <p className="rh-lead">{ko ? "그 작가의 세계로 들어갑니다." : "Enter their world."}</p>
        <PromoSearch locale={locale} />
        <p className="rh-path">
          {EXAMPLE_ARTISTS.map((artist, index) => (
            <span key={artist.slug}>
              {index > 0 ? <span aria-hidden="true"> → </span> : null}
              <Link href={`/artists/${artist.slug}`}>{artist.label}</Link>
            </span>
          ))}
        </p>
        <p>{ko ? "작가 3명 · 전시 접점 · 기록된 경로 1개" : "3 artists · 2 exhibitions · 1 documented path"}</p>
        <h2>{ko ? "한 사람을 검색하면 세계가 펼쳐집니다" : "One artist can open an entire world"}</h2>
        <p>{ko ? "전시를 열면 같은 자리에 있던 다른 작가를 만나고, 그 기록으로 다시 들어갑니다. Artist → Exhibition → Artist." : "Open an exhibition. If another artist was there, continue into their history. Artist → Exhibition → Artist."}</p>
        <h2>{ko ? "관계를 추측하지 않습니다" : "ROB does not invent relationships"}</h2>
        <p>{ko ? "같은 전시에 있었다면 그 전시를 보여 줍니다. 영향에 대한 판단은 사용자에게 남깁니다. 기록은 출처와 함께 자라고, 모든 전시를 가진 척하지 않습니다." : "If two artists shared a documented exhibition, ROB shows that exhibition. Interpretation stays with the visitor. The record grows with sources and does not pretend to be complete."}</p>
        <PromoCtas locale={locale} />
        <p><Link href="/about/how-to-use">{ko ? "사용법" : "How to use"}</Link></p>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "ROB", url: "https://rob-roleofbridge.com", potentialAction: { "@type": "SearchAction", target: "https://rob-roleofbridge.com/?q={search_term_string}", "query-input": "required name=search_term_string" } }) }} />
      </main>
    </div>
  );
}
