"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { F, S, colors } from "@/lib/design";
import ArtistBottomNav from "@/app/components/ArtistBottomNav";
import FeedPostCard from "@/app/components/FeedPostCard";
import type { FeedPost } from "@/app/components/FeedPostCard";
import NotificationsBell from "@/app/components/NotificationsBell";
import MobileInstallHint from "@/app/components/MobileInstallHint";
import { useLanguage } from "@/lib/useLanguage";
import { getAvailableLanguages } from "@/lib/translate";

type Props = {
  lang: string;
};

type FeedScope = "all" | "following" | "emerging";

export default function NowFeed({ lang }: Props) {
  const ko = lang === "ko";
  const router = useRouter();
  const { setLang } = useLanguage();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [feedScope, setFeedScope] = useState<FeedScope>("all");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadIdentity = useCallback(async () => {
    const meRes = await fetch("/api/auth/me?lite=1", { cache: "no-store" });
    const me = await meRes.json().catch(() => null);
    setIsLoggedIn(!!me?.session);
    setIsArtist(me?.session?.role === "artist");
  }, []);

  const loadFeed = useCallback(async (scope: FeedScope, before?: string | null) => {
    const appending = Boolean(before);
    if (appending) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", scope });
      if (before) params.set("before", before);
      const res = await fetch(`/api/artworks/feed?${params}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      const nextPosts: FeedPost[] = res.ok && data?.posts ? data.posts : [];
      setPosts((prev) => (appending ? [...prev, ...nextPosts] : nextPosts));
      setNextCursor(data?.nextCursor ?? null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  useEffect(() => {
    loadFeed(feedScope);
  }, [loadFeed, feedScope]);

  useEffect(() => {
    function onPosted() {
      loadFeed(feedScope);
    }
    window.addEventListener("rob-artwork-posted", onPosted);
    return () => window.removeEventListener("rob-artwork-posted", onPosted);
  }, [loadFeed, feedScope]);

  const scopes: { id: FeedScope; ko: string; en: string; needsAuth?: boolean }[] = [
    { id: "all", ko: "전체", en: "All" },
    { id: "following", ko: "팔로잉", en: "Following", needsAuth: true },
    { id: "emerging", ko: "이머징", en: "Emerging" },
  ];

  return (
    <>
      <div className="now-feed" style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 24 }}>
        <header
          className="now-feed-header"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: colors.bgPrimary,
            paddingTop: "env(safe-area-inset-top)",
            margin: "0 -12px",
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 8px" }}>
            <div>
              <div style={{ fontFamily: S, fontSize: 22, fontWeight: 600, color: colors.textPrimary, letterSpacing: "0.04em", lineHeight: 1 }}>
                ROB
              </div>
              <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.accent, marginTop: 3 }}>
                {ko ? "지금" : "Now"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as "en" | "ko" | "ja" | "fr")}
                aria-label={ko ? "언어" : "Language"}
                style={{
                  padding: "6px 8px",
                  border: `1px solid ${colors.border}`,
                  background: "transparent",
                  color: colors.textMuted,
                  fontFamily: F,
                  fontSize: 10,
                  minHeight: 36,
                }}
              >
                {getAvailableLanguages().map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              {isLoggedIn ? (
                <NotificationsBell />
              ) : (
                <Link
                  href="/login?redirect=/"
                  style={{
                    fontFamily: F,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: colors.textPrimary,
                    textDecoration: "none",
                    padding: "8px 10px",
                    minHeight: 36,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {ko ? "로그인" : "Log in"}
                </Link>
              )}
            </div>
          </div>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: "0 0 10px", lineHeight: 1.5 }}>
            {ko ? "지금 만들어지고 있는 작업." : "See what artists are making now."}
          </p>
        </header>

        <MobileInstallHint lang={lang} />

        <div style={{ display: "flex", gap: 8, padding: "4px 0 12px", overflowX: "auto" }}>
          {scopes.map((scope) => {
            const active = feedScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  if (scope.needsAuth && !isLoggedIn) {
                    router.push("/login?redirect=/");
                    return;
                  }
                  setFeedScope(scope.id);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? colors.textPrimary : colors.border}`,
                  background: active ? colors.textPrimary : "transparent",
                  color: active ? colors.bgPrimary : colors.textSecondary,
                  fontFamily: F,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minHeight: 36,
                }}
              >
                {ko ? scope.ko : scope.en}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, textAlign: "center", padding: "48px 0" }}>
            {ko ? "불러오는 중…" : "Loading…"}
          </p>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, margin: "0 0 16px", lineHeight: 1.6 }}>
              {feedScope === "following"
                ? ko
                  ? "아직 팔로우한 작가의 작업이 없어요."
                  : "No work from artists you follow yet."
                : ko
                  ? "아직 올라온 작업이 없어요. 첫 작업을 남겨보세요."
                  : "Nothing here yet. Be the first to add a work."}
            </p>
            {isArtist ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("rob-open-upload"))}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  background: colors.textPrimary,
                  color: colors.bgPrimary,
                  fontFamily: F,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  minHeight: 44,
                }}
              >
                {ko ? "작업 올리기" : "Upload work"}
              </button>
            ) : (
              <Link
                href="/login?role=artist&redirect=/"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  background: colors.textPrimary,
                  color: colors.bgPrimary,
                  fontFamily: F,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  minHeight: 44,
                }}
              >
                {ko ? "작가로 시작하기" : "Join as an artist"}
              </Link>
            )}
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} lang={lang} isLoggedIn={isLoggedIn} />
            ))}
            {nextCursor && (
              <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <button
                  type="button"
                  onClick={() => loadFeed(feedScope, nextCursor)}
                  disabled={loadingMore}
                  style={{
                    padding: "12px 28px",
                    border: `1px solid ${colors.border}`,
                    background: "transparent",
                    color: colors.textSecondary,
                    fontFamily: F,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    minHeight: 44,
                    width: "100%",
                  }}
                >
                  {loadingMore ? (ko ? "불러오는 중…" : "Loading…") : ko ? "더 보기" : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ArtistBottomNav lang={lang} activeTab="now" />
    </>
  );
}
