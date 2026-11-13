import Link from "next/link";

export default function ProNav({ current }: { current: "discover" | "watchlist" | "saved" | "shortlist" }) {
  const item = (href: string, key: typeof current, label: string) =>
    current === key ? (
      <span aria-current="page">{label}</span>
    ) : (
      <Link href={href}>{label}</Link>
    );
  return (
    <nav className="pd-nav" aria-label="ROB Pro">
      {item("/pro/discover", "discover", "발견")}
      {item("/pro/watchlist", "watchlist", "주시")}
      {item("/pro/shortlist", "shortlist", "숏리스트")}
      {item("/pro/saved-searches", "saved", "저장된 검색")}
    </nav>
  );
}
