import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { getServerSession } from "@/lib/auth";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";
import { listSavedSearches } from "@/lib/pro/privateStore";
import ProNav from "../ProNav";
import DeleteSavedSearch from "./DeleteSavedSearch";
import "@/app/components/history/history.css";
import "../discover/discover.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "저장된 검색",
  robots: { index: false, follow: false },
};

export default async function SavedSearchesPage() {
  if (!isProDiscoveryEnabled()) notFound();
  const session = getServerSession();
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap pd-wrap" id="main-content">
        <p className="rh-kicker">ROB Pro</p>
        <ProNav current="saved" />
        <h1 className="pd-title">저장된 검색</h1>
        {session ? <SavedList userId={session.userId} /> : <p><a href="/login?redirect=/pro/saved-searches">로그인하면 검색 조건을 저장할 수 있습니다.</a></p>}
      </main>
    </div>
  );
}

async function SavedList({ userId }: { userId: string }) {
  let items: Awaited<ReturnType<typeof listSavedSearches>> = [];
  try {
    items = await listSavedSearches(userId);
  } catch (error) {
    if (!isHistoryUnavailable(error)) throw error;
    return <p>저장된 검색을 불러오지 못했습니다.</p>;
  }
  if (items.length === 0) {
    return (
      <div>
        <p>저장된 검색 조건이 없습니다.</p>
        <p>
          <Link href="/pro/discover">작가 발견하기</Link>
        </p>
      </div>
    );
  }
  return (
    <ul className="rh-results">
      {items.map((item) => (
        <li key={item.id}>
          <article className="pd-card">
            <h2>{item.name}</h2>
            <p>{item.summary}</p>
            <p className="pd-meta">현재 {item.total}명</p>
            {item.newCount > 0 ? <p className="pd-meta">{item.newCount}명 새로 일치</p> : <p className="pd-meta">지난번 이후 새 결과 없음</p>}
            {item.capped ? <p className="pd-note">결과가 많아 새 결과는 이름순 500명 안에서만 셉니다.</p> : null}
            <p className="pd-meta">마지막 열람 {item.lastViewedAt.slice(0, 10)}</p>
            <p className="pd-meta">저장 {item.createdAt.slice(0, 10)}</p>
            <div className="pd-card-actions">
              <Link href={item.href}>검색 열기</Link>
              <DeleteSavedSearch id={item.id} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
