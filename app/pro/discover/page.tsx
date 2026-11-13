import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { getServerSession } from "@/lib/auth";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { HISTORY_READY_MIN, RICH_HISTORY_MIN } from "@/lib/history/policy";
import { loadPublicDiscoveryGraph } from "@/lib/pro/discoveryQuery";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";
import {
  DISCOVERY_COPY,
  discoverArtists,
  discoveryFilterKeys,
  discoveryHref,
  parseDiscoveryRequest,
  type DiscoveryCard,
  type DiscoveryOutcome,
  type ParsedDiscovery,
} from "@/lib/pro/discoveryPolicy";
import { canonicalSavedFilter } from "@/lib/pro/privatePolicy";
import { markSavedSearchViewed, watchedArtistIds } from "@/lib/pro/privateStore";
import { shortlistedArtistIds } from "@/lib/pro/shortlistStore";
import ProBeacon from "../ProBeacon";
import ProNav from "../ProNav";
import SaveSearch from "../SaveSearch";
import ShortlistButton from "../ShortlistButton";
import WatchButton from "../WatchButton";
import ArtistOpenLink from "./ArtistOpenLink";
import DiscoverAnalytics from "./DiscoverAnalytics";
import "@/app/components/history/history.css";
import "./discover.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "작가를 찾기",
  robots: { index: false, follow: false },
};

export default async function ProDiscoverPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isProDiscoveryEnabled()) notFound();
  const applied = parseDiscoveryRequest(searchParams);
  const keys = discoveryFilterKeys(applied);
  const savedId = firstParam(searchParams.saved);
  const session = getServerSession();
  const loginHref = session ? undefined : `/login?redirect=${encodeURIComponent(discoveryHref(applied))}`;
  let outcome: DiscoveryOutcome | null = null;
  let unavailable = false;
  let watched = new Set<string>();
  let shortlisted = new Set<string>();
  try {
    const graph = await loadPublicDiscoveryGraph();
    outcome = discoverArtists(graph, applied);
    try {
      if (session && savedId) {
        const filter = canonicalSavedFilter(applied);
        if (filter) await markSavedSearchViewed(session.userId, savedId, filter, graph);
      }
      if (session && outcome) {
        const ids = outcome.cards.map((card) => card.id);
        const [watchResult, shortlistResult] = await Promise.allSettled([
          watchedArtistIds(session.userId, ids),
          shortlistedArtistIds(session.userId, ids),
        ]);
        if (watchResult.status === "fulfilled") watched = watchResult.value;
        else if (!isHistoryUnavailable(watchResult.reason)) throw watchResult.reason;
        if (shortlistResult.status === "fulfilled") shortlisted = shortlistResult.value;
        else if (!isHistoryUnavailable(shortlistResult.reason)) throw shortlistResult.reason;
      }
    } catch (error) {
      if (!isHistoryUnavailable(error)) throw error;
    }
  } catch (error) {
    if (!isHistoryUnavailable(error)) throw error;
    unavailable = true;
  }

  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap pd-wrap" id="main-content">
        <DiscoverAnalytics searched={keys.length > 0} filterKeys={keys.join(",")} />
        {savedId ? <ProBeacon event="PRO_SAVED_SEARCH_OPENED" path="/pro/discover" /> : null}
        <p className="rh-kicker">ROB Pro</p>
        <ProNav current="discover" />
        <h1 className="pd-title">어떤 작가를 찾고 있나요?</h1>
        <p className="rh-lead">Find artists through their actual activity.</p>
        <p className="pd-disclaimer">{DISCOVERY_COPY.disclaimer}</p>
        <div className="pd-layout">
          <div>
            <FilterForm applied={applied} />
            <SaveSearch filters={canonicalSavedFilter(applied)} loginHref={loginHref} />
          </div>
          <section className="pd-results" aria-live="polite">
            {unavailable ? <p>전시 기록을 불러오지 못했습니다.</p> : null}
            {outcome ? <Results outcome={outcome} watched={watched} shortlisted={shortlisted} loginHref={loginHref} /> : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim() ?? "";
  return trimmed || null;
}

function FilterForm({ applied }: { applied: ParsedDiscovery }) {
  return (
    <form className="rh-form pd-filters" method="get" action="/pro/discover" role="search">
      <label htmlFor="discover-q">
        작가 이름
        <input id="discover-q" name="q" defaultValue={applied.q ?? ""} autoComplete="off" />
      </label>
      <label htmlFor="discover-city">
        도시
        <input id="discover-city" name="city" defaultValue={applied.city ?? ""} autoComplete="off" />
      </label>
      <label htmlFor="discover-country">
        국가
        <input id="discover-country" name="country" defaultValue={applied.country ?? ""} autoComplete="off" />
      </label>
      <label htmlFor="discover-from">
        전시 시작 연도
        <input id="discover-from" name="from" inputMode="numeric" defaultValue={applied.from ?? ""} />
      </label>
      <label htmlFor="discover-to">
        전시 끝 연도
        <input id="discover-to" name="to" inputMode="numeric" defaultValue={applied.to ?? ""} />
      </label>
      <label htmlFor="discover-recent">
        최근 활동
        <select id="discover-recent" name="recent" defaultValue={applied.recent ?? ""}>
          <option value="">지정 안 함</option>
          <option value="12m">최근 12개월</option>
          <option value="3y">최근 3년</option>
          <option value="5y">최근 5년</option>
        </select>
      </label>
      <label htmlFor="discover-min">
        최소 공개 전시 수
        <input id="discover-min" name="min" inputMode="numeric" defaultValue={applied.min ?? ""} />
      </label>
      <label htmlFor="discover-density">
        기록 밀도
        <select id="discover-density" name="density" defaultValue={applied.density ?? ""}>
          <option value="">지정 안 함</option>
          <option value="LOW_DENSITY">전시 1–{HISTORY_READY_MIN - 1}건</option>
          <option value="HISTORY_READY">
            전시 {HISTORY_READY_MIN}–{RICH_HISTORY_MIN - 1}건
          </option>
          <option value="RICH_HISTORY">전시 {RICH_HISTORY_MIN}건 이상</option>
        </select>
      </label>
      <label htmlFor="discover-connected">
        공동 전시 작가
        <input id="discover-connected" name="connected" defaultValue={applied.connected ?? ""} autoComplete="off" placeholder="슬러그 또는 이름" />
      </label>
      <label htmlFor="discover-space">
        공간
        <input id="discover-space" name="space" defaultValue={applied.space ?? ""} autoComplete="off" placeholder="슬러그 또는 이름" />
      </label>
      <label htmlFor="discover-sort">
        정렬
        <select id="discover-sort" name="sort" defaultValue={applied.sort}>
          <option value="relevant">필터에 맞는 기록 순</option>
          <option value="recent">최근 활동 순</option>
          <option value="exhibitions">공개 전시 수</option>
          <option value="name">이름</option>
        </select>
      </label>
      <p className="pd-note">{DISCOVERY_COPY.activityNote}</p>
      <p className="pd-note">순서는 함께 전시 수, 조건에 맞는 전시 수, 활동 연도, 이름만 사용합니다.</p>
      <div className="pd-actions">
        <button className="rh-button" type="submit">
          찾기
        </button>
        <Link href="/pro/discover">필터 넓히기</Link>
      </div>
    </form>
  );
}

function Results({
  outcome,
  watched,
  shortlisted,
  loginHref,
}: {
  outcome: DiscoveryOutcome;
  watched: Set<string>;
  shortlisted: Set<string>;
  loginHref?: string;
}) {
  if (outcome.status === "unknown_artist") {
    return <p>그 이름의 확인된 작가 기록을 찾지 못했습니다. 공동 전시는 확인된 전시 참여자만 사용합니다.</p>;
  }
  if (outcome.status === "ambiguous_artist") {
    return <p>같은 이름의 확인된 작가가 둘 이상입니다. 슬러그로 한 명을 지정해 주세요.</p>;
  }
  if (outcome.status === "unknown_space") {
    return <p>그 이름의 확인된 공간 기록을 찾지 못했습니다.</p>;
  }
  if (outcome.status === "ambiguous_space") {
    return <p>같은 이름의 공간이 둘 이상입니다. 슬러그로 한 곳을 지정해 주세요.</p>;
  }
  if (outcome.total === 0) {
    const bare = discoveryFilterKeys(outcome.applied).length === 0;
    return (
      <div>
        <p>{bare ? DISCOVERY_COPY.noneKo : DISCOVERY_COPY.emptyKo}</p>
        {bare ? null : <p>{DISCOVERY_COPY.emptyEn}</p>}
        {bare ? null : (
          <p>
            <Link href="/pro/discover">필터 넓히기</Link>
          </p>
        )}
      </div>
    );
  }
  const nextHref = outcome.nextCursor ? discoveryHref(outcome.applied, outcome.nextCursor) : null;
  return (
    <div>
      <p className="pd-meta">{outcome.total}명의 작가가 이 조건과 일치합니다.</p>
      <ul className="rh-results">
        {outcome.cards.map((card) => (
          <li key={card.id}>
            <ResultCard card={card} watching={watched.has(card.id)} shortlisted={shortlisted.has(card.id)} loginHref={loginHref} />
          </li>
        ))}
      </ul>
      {nextHref ? (
        <Link className="pd-next" href={nextHref}>
          다음 결과
        </Link>
      ) : null}
    </div>
  );
}

function ResultCard({
  card,
  watching,
  shortlisted,
  loginHref,
}: {
  card: DiscoveryCard;
  watching: boolean;
  shortlisted: boolean;
  loginHref?: string;
}) {
  const span = card.careerStart != null && card.careerEnd != null ? `${card.careerStart}–${card.careerEnd}` : null;
  return (
    <article className="pd-card">
      <h2>
        <ArtistOpenLink slug={card.slug}>{card.canonicalName}</ArtistOpenLink>
      </h2>
      {card.nativeName ? <p className="rh-native">{card.nativeName}</p> : null}
      <p className="pd-meta">
        공개 전시 {card.provenance.publicExhibitions}건
        {card.provenance.approvedExternal > 0 ? ` · 승인된 외부 출처 ${card.provenance.approvedExternal}건` : ""}
        {card.provenance.firstParty > 0 ? ` · 1차 기록 ${card.provenance.firstParty}건` : ""}
        {card.provenance.limitedFactual > 0 ? ` · 제한된 사실 기록 ${card.provenance.limitedFactual}건` : ""}
      </p>
      {span ? <p className="pd-meta">{span}</p> : null}
      {card.latestActivityLabel ? <p className="pd-meta">최근 확인된 활동: {card.latestActivityLabel}</p> : null}
      {card.topSpaces.length > 0 ? (
        <p className="pd-inline">
          공간:{" "}
          {card.topSpaces.map((space, index) => (
            <span key={space.id}>
              {index > 0 ? ", " : null}
              {space.slug ? <Link href={`/spaces/${space.slug}`}>{space.name}</Link> : space.name}
              {` ${space.count}건`}
            </span>
          ))}
        </p>
      ) : null}
      <p className="pd-meta">확인된 공동 전시 작가 {card.connectionCount}명</p>
      <p className="pd-meta">이 결과가 나온 이유</p>
      <ul className="pd-reasons">
        {card.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {card.sharedExhibitions.length > 0 ? (
        <ul className="pd-reasons">
          {card.sharedExhibitions.map((exhibition) => (
            <li key={exhibition.id}>
              {exhibition.slug ? (
                <Link href={`/exhibitions/${exhibition.slug}`}>{exhibition.title}</Link>
              ) : (
                exhibition.title
              )}
              {exhibition.label ? ` · ${exhibition.label}` : ""}
            </li>
          ))}
          {card.sharedMore > 0 ? <li>외 {card.sharedMore}건</li> : null}
        </ul>
      ) : null}
      {card.sparseNote ? (
        <p className="pd-note">
          {card.sparseNote} ROB에는 이 작가의 확인된 전시 기록이 현재 {card.exhibitionCount}건 있습니다.
        </p>
      ) : null}
      <div className="pd-card-actions">
        <WatchButton artistEntityId={card.id} slug={card.slug} watching={watching} loginHref={loginHref} />
        <ShortlistButton artistEntityId={card.id} slug={card.slug} shortlisted={shortlisted} loginHref={loginHref} />
      </div>
    </article>
  );
}
