import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { getServerSession } from "@/lib/auth";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { listArtistWatches } from "@/lib/pro/privateStore";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";
import ProBeacon from "../ProBeacon";
import ProNav from "../ProNav";
import WatchButton from "../WatchButton";
import "@/app/components/history/history.css";
import "../discover/discover.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "주시하는 작가",
  robots: { index: false, follow: false },
};

type WatchSort = "watched" | "name" | "active";

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isProDiscoveryEnabled()) notFound();
  const session = getServerSession();
  const sort = readSort(searchParams.sort);
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap pd-wrap" id="main-content">
        <ProBeacon event="PRO_WATCHLIST_OPENED" path="/pro/watchlist" />
        <p className="rh-kicker">ROB Pro</p>
        <ProNav current="watchlist" />
        <h1 className="pd-title">주시하는 작가</h1>
        {session ? <Watchlist userId={session.userId} sort={sort} /> : <LoginPrompt href="/login?redirect=/pro/watchlist" />}
      </main>
    </div>
  );
}

async function Watchlist({ userId, sort }: { userId: string; sort: WatchSort }) {
  let items: Awaited<ReturnType<typeof listArtistWatches>> = [];
  try {
    items = await listArtistWatches(userId);
  } catch (error) {
    if (!isHistoryUnavailable(error)) throw error;
    return <p>주시 목록을 불러오지 못했습니다.</p>;
  }
  const ordered = [...items].sort((a, b) => compareWatches(a, b, sort));
  return (
    <div>
      <p className="pd-meta">새로 확인된 활동을 이 목록에서 다시 볼 수 있습니다. 알림은 아직 보내지 않습니다.</p>
      <nav className="pd-nav" aria-label="정렬">
        <Link href="/pro/watchlist?sort=watched" aria-current={sort === "watched" ? "page" : undefined}>
          최근 주시
        </Link>
        <Link href="/pro/watchlist?sort=name" aria-current={sort === "name" ? "page" : undefined}>
          이름
        </Link>
        <Link href="/pro/watchlist?sort=active" aria-current={sort === "active" ? "page" : undefined}>
          최근 활동
        </Link>
      </nav>
      {ordered.length === 0 ? (
        <div>
          <p>아직 주시 중인 작가가 없습니다.</p>
          <p>
            <Link href="/pro/discover">작가 발견하기</Link>
          </p>
        </div>
      ) : (
        <ul className="rh-results">
          {ordered.map((item) => (
            <li key={item.id}>
              <article className="pd-card">
                <h2>
                  {item.available && item.slug && item.canonicalName ? (
                    <Link href={`/artists/${item.slug}`}>{item.canonicalName}</Link>
                  ) : (
                    "기록을 찾을 수 없습니다"
                  )}
                </h2>
                {item.nativeName ? <p className="rh-native">{item.nativeName}</p> : null}
                {item.available ? (
                  item.exhibitionCount > 0 ? (
                    <>
                      <p className="pd-meta">공개 전시 {item.exhibitionCount}건</p>
                      {item.latestActivityLabel ? <p className="pd-meta">최근 확인된 활동: {item.latestActivityLabel}</p> : null}
                      {item.latestExhibitionTitle ? <p className="pd-meta">최근 전시: {item.latestExhibitionTitle}</p> : null}
                    </>
                  ) : (
                    <p>현재 공개된 전시 기록이 없습니다.</p>
                  )
                ) : (
                  <p>이 작가의 공개 기록을 더 이상 찾을 수 없습니다.</p>
                )}
                <p className="pd-meta">주시 시작: {item.watchedAt.slice(0, 10)}</p>
                <div className="pd-card-actions">
                  <WatchButton
                    artistEntityId={item.artistEntityId}
                    slug={item.slug ?? item.artistEntityId}
                    watching
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function compareWatches(
  a: Awaited<ReturnType<typeof listArtistWatches>>[number],
  b: Awaited<ReturnType<typeof listArtistWatches>>[number],
  sort: WatchSort,
) {
  const name = (a.canonicalName ?? "").localeCompare(b.canonicalName ?? "", "ko");
  if (sort === "name") return name;
  if (sort === "active") return b.latestYear - a.latestYear || name;
  return b.watchedAt.localeCompare(a.watchedAt) || name;
}

function readSort(value: string | string[] | undefined): WatchSort {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "name" || raw === "active") return raw;
  return "watched";
}

function LoginPrompt({ href }: { href: string }) {
  return (
    <p>
      <a href={href}>로그인하면 작가를 주시할 수 있습니다.</a>
    </p>
  );
}
