import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { countUnreadAlerts } from "@/lib/pro/activityAlertStore";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";

export default async function ProNav({
  current,
}: {
  current: "discover" | "watchlist" | "saved" | "shortlist" | "alerts";
}) {
  const unread = await unreadCount();
  const item = (href: string, key: typeof current, label: string) =>
    current === key ? (
      <span aria-current="page">{label}</span>
    ) : (
      <Link href={href}>{label}</Link>
    );
  const alertLabel = unread > 0 ? `알림 읽지 않음 ${unread}` : "알림";
  return (
    <nav className="pd-nav" aria-label="ROB Pro">
      {item("/pro/discover", "discover", "발견")}
      {item("/pro/watchlist", "watchlist", "주시")}
      {item("/pro/shortlist", "shortlist", "숏리스트")}
      {item("/pro/saved-searches", "saved", "저장된 검색")}
      {item("/pro/alerts", "alerts", alertLabel)}
    </nav>
  );
}

async function unreadCount(): Promise<number> {
  if (!isProDiscoveryEnabled()) return 0;
  const session = getServerSession();
  if (!session) return 0;
  try {
    return await countUnreadAlerts(session.userId);
  } catch {
    return 0;
  }
}
