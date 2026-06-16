"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { F, S, colors } from "@/lib/design";
import HashtagText from "@/app/components/HashtagText";
import ArtworkUploadModal from "@/app/components/ArtworkUploadModal";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";
import type { ArtworkPostType } from "@/lib/artworkTypes";

type FeedPost = {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  postType: ArtworkPostType;
  hashtags: string[];
  createdAt: string;
  artist: {
    artistId: string;
    name: string;
    profileImage: string | null;
    genre: string | null;
  } | null;
};

type Props = {
  lang: string;
};

export default function ArtistFeed({ lang }: Props) {
  const ko = lang === "ko";
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/artworks/feed?limit=40", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.posts) setPosts(data.posts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
          <div>
            <h1 style={{ fontFamily: S, fontSize: 28, fontWeight: 300, color: colors.textPrimary, margin: 0 }}>
              {ko ? "작업 피드" : "Work Feed"}
            </h1>
            <p style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, margin: "6px 0 0" }}>
              {ko ? "작가들이 올린 최신 작업" : "Latest posts from artists"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/artist/me")}
            style={{ padding: "8px 14px", border: `1px solid ${colors.border}`, background: "transparent", fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", color: colors.textSecondary }}
          >
            {ko ? "마이페이지" : "My Page"}
          </button>
        </div>

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, textAlign: "center", padding: "48px 0" }}>
            {ko ? "불러오는 중…" : "Loading…"}
          </p>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px", border: `1px dashed ${colors.border}`, background: colors.bgAccent }}>
            <p style={{ fontFamily: S, fontSize: 20, fontWeight: 300, color: colors.textPrimary, margin: "0 0 8px" }}>
              {ko ? "아직 게시물이 없어요" : "No posts yet"}
            </p>
            <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: "0 0 20px", lineHeight: 1.6 }}>
              {ko ? "첫 작업을 올려보세요." : "Be the first to share your work."}
            </p>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              style={{ padding: "12px 28px", border: "none", background: colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
            >
              + {ko ? "작업 올리기" : "Share work"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {posts.map((post) => (
              <article key={post.id} style={{ border: `1px solid ${colors.border}`, background: colors.bgCard, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                  <button
                    type="button"
                    onClick={() => post.artist && router.push(`/artist/public/${encodeURIComponent(post.artist.artistId)}`)}
                    style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: colors.bgAccent, border: `1px solid ${colors.border}`, flexShrink: 0 }}>
                      {post.artist?.profileImage ? (
                        <img src={post.artist.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontFamily: S, fontSize: 14, color: colors.textLight }}>
                          {post.artist?.name?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>{post.artist?.name || "—"}</div>
                      <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>
                        {artworkTimeAgo(post.createdAt, lang)}
                        {post.artist?.genre ? ` · ${post.artist.genre}` : ""}
                      </div>
                    </div>
                  </button>
                  <span style={{ marginLeft: "auto", fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: post.postType === "exhibition" ? colors.success : colors.accent }}>
                    {ko ? POST_TYPE_LABELS[post.postType].ko : POST_TYPE_LABELS[post.postType].en}
                  </span>
                </div>

                <div style={{ aspectRatio: "1", background: "#111" }}>
                  <img src={post.imageUrl} alt={post.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>

                <div style={{ padding: "12px 14px 16px" }}>
                  {post.title && (
                    <div style={{ fontFamily: S, fontSize: 15, marginBottom: 6, color: colors.textPrimary }}>{post.title}</div>
                  )}
                  {post.caption && (
                    <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                      <HashtagText text={post.caption} />
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p style={{ fontFamily: F, fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: 32 }}>
          <Link href="/explore" style={{ color: colors.accent, textDecoration: "none" }}>
            {ko ? "해시태그로 탐색 →" : "Explore by hashtag →"}
          </Link>
        </p>
      </div>

      <button
        type="button"
        aria-label={ko ? "작업 올리기" : "Share work"}
        onClick={() => setUploadOpen(true)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 28,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: colors.textPrimary,
          color: colors.bgPrimary,
          fontSize: 28,
          lineHeight: 1,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          zIndex: 100,
        }}
      >
        +
      </button>

      <ArtworkUploadModal
        lang={lang}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onPosted={load}
      />
    </>
  );
}
