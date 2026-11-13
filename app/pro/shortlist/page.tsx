import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { getServerSession } from "@/lib/auth";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";
import { listShortlistPage, type ShortlistListItem } from "@/lib/pro/shortlistStore";
import ProBeacon from "../ProBeacon";
import ProNav from "../ProNav";
import NoteText from "./NoteText";
import ShortlistCardActions from "./ShortlistCardActions";
import "@/app/components/history/history.css";
import "../discover/discover.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "숏리스트",
  robots: { index: false, follow: false },
};

export default async function ShortlistPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isProDiscoveryEnabled()) notFound();
  const session = getServerSession();
  const cursor = firstParam(searchParams.cursor);
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap pd-wrap" id="main-content">
        <ProBeacon event="PRO_SHORTLIST_OPENED" path="/pro/shortlist" />
        <p className="rh-kicker">ROB Pro</p>
        <ProNav current="shortlist" />
        <h1 className="pd-title">숏리스트</h1>
        <p className="pd-meta">검토 중인 작가입니다. 주시와 따로 저장되며, 메모는 이 계정에만 보입니다.</p>
        {session ? (
          <Shortlist userId={session.userId} cursor={cursor} />
        ) : (
          <p>
            <a href="/login?redirect=/pro/shortlist">로그인하면 작가를 숏리스트에 넣을 수 있습니다.</a>
          </p>
        )}
      </main>
    </div>
  );
}

async function Shortlist({ userId, cursor }: { userId: string; cursor: string | null }) {
  let page: Awaited<ReturnType<typeof listShortlistPage>>;
  try {
    page = await listShortlistPage(userId, cursor);
  } catch (error) {
    if (!isHistoryUnavailable(error)) throw error;
    return <p>숏리스트를 불러오지 못했습니다.</p>;
  }
  if (!page.ok) return <p>목록의 다음 위치를 읽지 못했습니다.</p>;
  if (page.items.length === 0 && !cursor) {
    return (
      <div>
        <p>아직 숏리스트에 넣은 작가가 없습니다.</p>
        <p>
          <Link href="/pro/discover">작가 발견하기</Link>
        </p>
      </div>
    );
  }
  return (
    <div>
      {page.items.length === 0 ? <p>다음 작가가 없습니다.</p> : null}
      <ul className="rh-results">
        {page.items.map((item) => (
          <li key={item.id}>
            <ShortlistCard item={item} />
          </li>
        ))}
      </ul>
      {page.nextCursor ? (
        <Link className="pd-next" href={`/pro/shortlist?cursor=${encodeURIComponent(page.nextCursor)}`}>
          다음 결과
        </Link>
      ) : null}
    </div>
  );
}

function ShortlistCard({ item }: { item: ShortlistListItem }) {
  const name = item.available && item.slug && item.canonicalName ? item.canonicalName : null;
  return (
    <article className="pd-card">
      <h2>{name && item.slug ? <Link href={`/artists/${item.slug}`}>{name}</Link> : "기록을 찾을 수 없습니다"}</h2>
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
      {item.spaces.length > 0 ? (
        <p className="pd-inline">
          공간:{" "}
          {item.spaces.map((space, index) => (
            <span key={`${space.slug ?? space.name}-${index}`}>
              {index > 0 ? ", " : null}
              {space.slug ? <Link href={`/spaces/${space.slug}`}>{space.name}</Link> : space.name}
              {` ${space.count}건`}
            </span>
          ))}
        </p>
      ) : null}
      {item.notePreview ? <NoteText body={item.notePreview} /> : <p className="pd-note">비공개 메모 없음</p>}
      <p className="pd-meta">
        추가 {item.createdAt.slice(0, 10)} · 업데이트 {item.updatedAt.slice(0, 10)}
      </p>
      <ShortlistCardActions artistEntityId={item.artistEntityId} slug={item.slug} status={item.status} noteBody={item.noteBody} />
    </article>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim() ?? "";
  return trimmed || null;
}
