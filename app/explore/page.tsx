"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import HashtagText from "@/app/components/HashtagText";
import { F, S, colors } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";
import type { ArtworkPostType } from "@/lib/artworkTypes";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";

type ExplorePost = {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  postType: ArtworkPostType;
  hashtags: string[];
  seriesTitle: string | null;
  createdAt: string;
  artist: {
    artistId: string;
    name: string;
    genre: string | null;
    country: string | null;
    city: string | null;
    profileImage: string | null;
  } | null;
};

function timeAgo(iso: string, lang: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ko" ? "방금" : "Just now";
  if (mins < 60) return lang === "ko" ? `${mins}분 전` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "ko" ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ko" ? `${days}일 전` : `${days}d ago`;
}

export default function ExplorePage() {
  const { lang } = useLanguage();
  const ko = lang === "ko";
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag") || "";

  const [tagInput, setTagInput] = useState(initialTag);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [postType, setPostType] = useState<"all" | ArtworkPostType>("all");
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const load = useCallback(async (tag: string, type: string) => {
    const normalized = tag.trim().toLowerCase().replace(/^#+/, "");
    if (normalized.length < 2) {
      setPosts([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ tag: normalized, limit: "48" });
      if (type !== "all") params.set("postType", type);
      const res = await fetch(`/api/artworks/explore?${params}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.posts) setPosts(data.posts);
      else setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTag) {
      setActiveTag(initialTag);
      load(initialTag, postType);
    }
  }, [initialTag, load, postType]);

  useEffect(() => {
    const q = tagInput.trim().replace(/^#+/, "");
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/hashtags/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d?.tags ?? []))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [tagInput]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const tag = tagInput.trim().toLowerCase().replace(/^#+/, "");
    setActiveTag(tag);
    load(tag, postType);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tag) url.searchParams.set("tag", tag);
      else url.searchParams.delete("tag");
      window.history.replaceState({}, "", url.toString());
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: colors.accent, margin: "0 0 8px" }}>
            {ko ? "해시태그 탐색" : "Hashtag Explore"}
          </p>
          <h1 style={{ fontFamily: S, fontSize: 32, fontWeight: 300, margin: "0 0 8px", color: colors.textPrimary }}>
            {ko ? "최신 작업 발견" : "Discover recent work"}
          </h1>
          <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
            {ko
              ? "옛 인스타처럼 해시태그별 최신순으로 전 세계 작가의 작업·전시를 찾아보세요."
              : "Search by hashtag — newest first, like early Instagram."}
          </p>
        </div>

        <form onSubmit={onSearch} style={{ marginBottom: 20, position: "relative" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: colors.textMuted, fontFamily: F, fontSize: 16 }}>#</span>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder={ko ? "painting, memory, seoul…" : "painting, memory, seoul…"}
                style={{
                  width: "100%",
                  padding: "14px 14px 14px 28px",
                  border: `1px solid ${colors.border}`,
                  background: colors.bgCard,
                  fontFamily: F,
                  fontSize: 14,
                  outline: "none",
                }}
              />
              {suggestions.length > 0 && tagInput.trim() && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: colors.bgCard, border: `1px solid ${colors.border}`, borderTop: "none" }}>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setTagInput(s); setSuggestions([]); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", fontFamily: F, fontSize: 13, cursor: "pointer", color: colors.textSecondary }}
                    >
                      #{s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              style={{ padding: "0 24px", border: "none", background: colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {ko ? "검색" : "Search"}
            </button>
          </div>
        </form>

        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {(["all", "work", "exhibition"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setPostType(t);
                if (activeTag) load(activeTag, t);
              }}
              style={{
                padding: "8px 16px",
                border: `1px solid ${postType === t ? colors.textPrimary : colors.border}`,
                background: postType === t ? colors.textPrimary : "transparent",
                color: postType === t ? colors.bgPrimary : colors.textSecondary,
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t === "all" ? (ko ? "전체" : "All") : ko ? POST_TYPE_LABELS[t].ko : POST_TYPE_LABELS[t].en}
            </button>
          ))}
        </div>

        {activeTag && (
          <p style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, marginBottom: 20 }}>
            #{activeTag} · {ko ? "최신순" : "Recent"} · {posts.length} {ko ? "개" : "posts"}
          </p>
        )}

        {!activeTag && (
          <div style={{ padding: "48px 24px", textAlign: "center", border: `1px dashed ${colors.border}` }}>
            <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, margin: 0 }}>
              {ko ? "해시태그를 입력해 검색하세요. 예: #painting #installation" : "Enter a hashtag to search. e.g. #painting #installation"}
            </p>
          </div>
        )}

        {loading && <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted }}>{ko ? "불러오는 중…" : "Loading…"}</p>}

        {!loading && activeTag && posts.length === 0 && (
          <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>
            {ko ? "아직 이 태그의 게시물이 없습니다." : "No posts with this hashtag yet."}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {posts.map((post) => (
            <article key={post.id} style={{ border: `1px solid ${colors.border}`, background: colors.bgCard }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: `1px solid ${colors.borderLight}` }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: colors.bgAccent, flexShrink: 0 }}>
                  {post.artist?.profileImage ? (
                    <img src={post.artist.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S, fontSize: 14, color: colors.textLight }}>
                      {post.artist?.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {post.artist && (
                    <Link href={`/artist/public/${encodeURIComponent(post.artist.artistId)}`} style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: colors.textPrimary, textDecoration: "none" }}>
                      {post.artist.name}
                    </Link>
                  )}
                  <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>
                    {[post.artist?.genre, post.artist?.city, post.artist?.country].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 8px", background: post.postType === "exhibition" ? "rgba(90,122,90,0.1)" : "rgba(139,115,85,0.1)", color: post.postType === "exhibition" ? colors.success : colors.accent }}>
                  {ko ? POST_TYPE_LABELS[post.postType].ko : POST_TYPE_LABELS[post.postType].en}
                </span>
              </div>

              <div style={{ aspectRatio: "1", background: colors.bgAccent, overflow: "hidden" }}>
                <img src={post.imageUrl} alt={post.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>

              <div style={{ padding: "12px 14px 16px" }}>
                <div style={{ fontFamily: F, fontSize: 10, color: colors.textLight, marginBottom: 8 }}>
                  {timeAgo(post.createdAt, lang)}
                </div>
                {post.title && (
                  <div style={{ fontFamily: S, fontSize: 16, color: colors.textPrimary, marginBottom: 6 }}>{post.title}</div>
                )}
                {post.caption && (
                  <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, margin: "0 0 10px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    <HashtagText text={post.caption} />
                  </p>
                )}
                {post.seriesTitle && (
                  <span style={{ fontFamily: F, fontSize: 10, color: colors.accent }}>{post.seriesTitle}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
