"use client";

import { useEffect } from "react";
import Link from "next/link";
import { pushRobEventOnce } from "@/lib/publicGrowth/analytics";
import type { HistoryLocale } from "@/lib/history/locale";

export default function GuideView({ locale }: { locale: HistoryLocale }) {
  const ko = locale === "ko";
  useEffect(() => {
    pushRobEventOnce("GUIDE_PAGE_OPENED", locale, { language: locale, route: "/about/how-to-use" });
  }, [locale]);

  if (ko) {
    return (
      <article className="rh-prose">
        <h1 className="rh-title">ROB 사용법</h1>
        <p className="rh-lead">작가 한 명에서 시작해, 그가 지나온 세계를 따라가세요.</p>
        <p>ROB는 한 사람의 약력을 압축한 백과사전이 아닙니다. 작가를 검색하고, 기록된 전시를 열고, 같은 전시에 있던 다른 작가로 넘어갑니다.</p>
        <h2>검색</h2>
        <p>홈에서 영문 이름, 원어 이름, 확인된 별칭을 입력합니다. Lee Ufan, 이우환, Lee U Fan은 같은 작가로 연결될 수 있습니다.</p>
        <h2>이력과 순간</h2>
        <p>이력은 현재 확인된 전시입니다. 기록이 없는 해가 활동이 없었다는 뜻은 아닙니다. 전시를 열면 제목, 날짜, 장소, 참여 작가, 출처를 볼 수 있습니다.</p>
        <h2>연결</h2>
        <p>같은 전시의 다른 작가를 누르면 작가 A → 전시 → 작가 B로 이동합니다. ROB는 영향이나 친분을 추측하지 않습니다. <Link href="/history/explore">Explore</Link>에서 여정, 순간, 경로, 공간을 볼 수 있습니다.</p>
        <h2>출처와 빈칸</h2>
        <p>출처는 사실을 어디서 확인했는지를 보여 주며, 그 기관이 ROB를 보증한다는 뜻은 아닙니다. 이미지는 사용 권리가 확인된 것만 표시합니다. 잘못된 기록은 <Link href="/about/data">Report issue</Link>로 알릴 수 있습니다.</p>
      </article>
    );
  }

  return (
    <article className="rh-prose">
      <h1 className="rh-title">How to use ROB</h1>
      <p className="rh-lead">Start with one artist. Follow the world they moved through.</p>
      <p>ROB is not an encyclopedia. Search an artist, open a documented exhibition, and continue into another artist who was there.</p>
      <h2>Search</h2>
      <p>Enter a canonical name, native name, or verified alias. Lee Ufan, 이우환, and Lee U Fan can resolve to the same artist.</p>
      <h2>History and moments</h2>
      <p>History shows exhibitions documented so far. A year without a row is not a year without activity. A moment shows title, date, place, participants, and source.</p>
      <h2>Connections</h2>
      <p>Opening another name moves Artist A → Exhibition → Artist B. ROB does not infer influence or friendship. <Link href="/history/explore">Explore</Link> shows journeys, moments, paths, and spaces.</p>
      <h2>Sources and gaps</h2>
      <p>A source says where a fact was read. It is not an endorsement. Images appear only when their use is cleared. Use <Link href="/about/data">Report issue</Link> for a correction.</p>
    </article>
  );
}
