import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { getServerSession } from "@/lib/auth";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { listActivityAlerts, type AlertListItem } from "@/lib/pro/activityAlertStore";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";
import ProBeacon from "../ProBeacon";
import ProNav from "../ProNav";
import { AlertActions, MarkAllRead } from "./AlertActions";
import "@/app/components/history/history.css";
import "../discover/discover.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "알림",
  robots: { index: false, follow: false },
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isProDiscoveryEnabled()) notFound();
  const session = getServerSession();
  const cursor = firstParam(searchParams.cursor);
  const unreadOnly = firstParam(searchParams.unread) === "1";
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap pd-wrap" id="main-content">
        <ProBeacon event="PRO_ALERTS_OPENED" path="/pro/alerts" />
        <p className="rh-kicker">ROB Pro</p>
        <ProNav current="alerts" />
        <h1 className="pd-title">알림</h1>
        <p className="pd-meta">주시 중인 작가의 공개 기록이 ROB에 추가되면 여기에 표시됩니다. 숏리스트만으로는 알림이 생기지 않습니다.</p>
        {session ? (
          <Alerts userId={session.userId} cursor={cursor} unreadOnly={unreadOnly} />
        ) : (
          <p>
            <a href="/login?redirect=/pro/alerts">로그인하면 알림을 볼 수 있습니다.</a>
          </p>
        )}
      </main>
    </div>
  );
}

async function Alerts({ userId, cursor, unreadOnly }: { userId: string; cursor: string | null; unreadOnly: boolean }) {
  let page: Awaited<ReturnType<typeof listActivityAlerts>>;
  try {
    page = await listActivityAlerts(userId, cursor, unreadOnly);
  } catch (error) {
    if (!isHistoryUnavailable(error)) throw error;
    return <p>알림을 불러오지 못했습니다.</p>;
  }
  if (!page.ok) return <p>목록의 다음 위치를 읽지 못했습니다.</p>;
  return (
    <div>
      <p className="pd-meta">
        읽지 않음 {page.unreadCount}
      </p>
      <div className="pd-alert-toolbar">
        <Link href="/pro/alerts">전체</Link>
        <Link href="/pro/alerts?unread=1">읽지 않은 알림</Link>
        <MarkAllRead />
      </div>
      {page.items.length === 0 ? <p>{unreadOnly ? "읽지 않은 알림이 없습니다." : "아직 알림이 없습니다."}</p> : null}
      <ul className="rh-results">
        {page.items.map((item) => (
          <li key={item.id}>
            <AlertCard item={item} />
          </li>
        ))}
      </ul>
      {page.nextCursor ? (
        <Link className="pd-next" href={`/pro/alerts?cursor=${encodeURIComponent(page.nextCursor)}${unreadOnly ? "&unread=1" : ""}`}>
          다음 알림
        </Link>
      ) : null}
    </div>
  );
}

function AlertCard({ item }: { item: AlertListItem }) {
  const recordedDay = item.recordedAt.slice(0, 10);
  return (
    <article className="pd-card pd-alert-card">
      <p className="pd-alert-state">{item.readAt ? "읽음" : "읽지 않음"}</p>
      <h2>
        {item.artistName && item.artistSlug ? (
          <Link href={`/artists/${item.artistSlug}`}>{item.artistName}</Link>
        ) : (
          "작가를 찾을 수 없습니다"
        )}
      </h2>
      <p className="pd-alert-message">{item.message}</p>
      {item.exhibitionTitle ? (
        <p className="pd-meta">
          전시: {item.href ? <Link href={item.href}>{item.exhibitionTitle}</Link> : item.exhibitionTitle}
        </p>
      ) : (
        <p>이 전시의 공개 기록을 더 이상 찾을 수 없습니다.</p>
      )}
      {item.spaceName ? <p className="pd-meta">공간: {item.spaceName}</p> : null}
      {item.eventDateLabel ? <p className="pd-meta">전시 시기: {item.eventDateLabel}</p> : null}
      <p className="pd-meta">ROB 기록일 (UTC): {recordedDay}</p>
      <AlertActions id={item.id} href={item.href} artistSlug={item.artistSlug} read={Boolean(item.readAt)} />
    </article>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim() ?? "";
  return trimmed || null;
}
