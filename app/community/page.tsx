"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { type SupportedLang } from "@/lib/translateApi";
import TopBar from "@/app/components/TopBar";
import { PostSkeleton } from "@/app/components/Skeleton";
import { useFetch } from "@/lib/useFetch";
import { F, S } from "@/lib/design";

type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "artist" | "gallery";
  category: string;
  title: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  comments: Comment[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: "artist" | "gallery";
  content: string;
  createdAt: number;
};

type Session = { userId: string; role: string; email?: string };

const CATEGORIES = [
  { key: "all", emoji: "" },
  { key: "find_collab", emoji: "🎭" },
  { key: "art_chat", emoji: "🎨" },
  { key: "meetup", emoji: "📍" },
  { key: "find_exhibit", emoji: "🏛️" },
];

export default function CommunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const initialCat = searchParams.get("cat") || "all";
  const [activeCategory, setActiveCategory] = useState(initialCat);

  const postsUrl = activeCategory === "all" ? "/api/community/posts" : `/api/community/posts?category=${activeCategory}`;
  const { data: postsData, isLoading: postsLoading, mutate: mutatePosts } = useFetch<{ posts: Post[] }>(postsUrl);
  const posts = postsData?.posts ?? [];
  const loading = postsLoading;

  // New post form
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("find_collab");
  const [posting, setPosting] = useState(false);

  // Expanded post (for comments)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Translation state: { [postId]: { title, content, comments: { [commentId]: string }, loading } }
  const [translations, setTranslations] = useState<Record<string, {
    title?: string; content?: string;
    comments?: Record<string, string>;
    loading?: boolean;
  }>>({});

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.session) setSession(d.session); })
      .catch(() => {});
  }, []);

  async function handleCreatePost() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: newCategory,
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setNewCategory("find_collab");
        setShowNewPost(false);
        mutatePosts();
      }
    } catch (e) {
      console.error(e);
    }
    setPosting(false);
  }

  async function handleLike(postId: string) {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      if (data.post) {
        mutatePosts();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleComment(postId: string) {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          mutatePosts();
        }
        setCommentText("");
      }
    } catch (e) {
      console.error(e);
    }
    setCommenting(false);
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    const res = await fetch(`/api/community/posts/${postId}/comment`, { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ commentId }) });
    if (res.ok) { const d = await res.json(); if (d.post) mutatePosts(); }
  }

  async function handleEditComment(postId: string, commentId: string) {
    if (!editingCommentText.trim()) return;
    const res = await fetch(`/api/community/posts/${postId}/comment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ commentId, content: editingCommentText }) });
    if (res.ok) { const d = await res.json(); if (d.post) { mutatePosts(); setEditingCommentId(null); } }
  }

  async function translatePost(post: Post) {
    const postId = post.id;
    // Toggle off if already translated
    if (translations[postId]?.title) {
      setTranslations((prev) => { const next = { ...prev }; delete next[postId]; return next; });
      return;
    }
    // Mark loading
    setTranslations((prev) => ({ ...prev, [postId]: { loading: true } }));
    try {
      // Batch all texts: [title, content, ...commentContents]
      const allTexts = [post.title, post.content, ...post.comments.map((c) => c.content)];
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: allTexts, targetLang: lang }),
      });
      const data = await res.json().catch(() => null);
      const translated: string[] = data?.translated || allTexts;

      const tComments: Record<string, string> = {};
      post.comments.forEach((c, i) => { tComments[c.id] = translated[2 + i] || c.content; });

      setTranslations((prev) => ({
        ...prev,
        [postId]: { title: translated[0], content: translated[1], comments: tComments, loading: false },
      }));
    } catch (e) {
      console.error("Translation failed:", e);
      setTranslations((prev) => ({ ...prev, [postId]: { loading: false } }));
    }
  }

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return lang === "ko" ? "방금" : lang === "ja" ? "たった今" : "just now";
    if (mins < 60) return `${mins}${lang === "ko" ? "분 전" : lang === "ja" ? "分前" : "m ago"}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${lang === "ko" ? "시간 전" : lang === "ja" ? "時間前" : "h ago"}`;
    const days = Math.floor(hours / 24);
    return `${days}${lang === "ko" ? "일 전" : lang === "ja" ? "日前" : "d ago"}`;
  }

  function categoryLabel(key: string): string {
    return t(`community_cat_${key}`, lang);
  }

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F4" }}>
      <TopBar />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 12 }}>
            {t("community_badge", lang)}
          </div>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 400, color: "#1A1A1A", margin: "0 0 12px", lineHeight: 1.2 }}>
            {t("community_title", lang)}
          </h1>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.6, margin: 0 }}>
            {t("community_subtitle", lang)}
          </p>
        </div>

        {/* Category Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: "8px 16px",
                border: activeCategory === cat.key ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
                background: activeCategory === cat.key ? "#1A1A1A" : "transparent",
                color: activeCategory === cat.key ? "#FDFBF7" : "#8A8580",
                fontFamily: F,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== cat.key) {
                  e.currentTarget.style.borderColor = "#1A1A1A";
                  e.currentTarget.style.color = "#1A1A1A";
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== cat.key) {
                  e.currentTarget.style.borderColor = "#E8E3DB";
                  e.currentTarget.style.color = "#8A8580";
                }
              }}
            >
              {cat.emoji ? `${cat.emoji} ` : ""}{categoryLabel(cat.key)}
            </button>
          ))}
          </div>
          {session && (
            <button
              onClick={() => { setShowNewPost(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ padding: "8px 20px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              + {t("community_new_post", lang)}
            </button>
          )}
        </div>

        {/* New Post Button / Form */}
        {session ? (
          !showNewPost ? (
            <button
              onClick={() => setShowNewPost(true)}
              style={{
                width: "100%",
                padding: "20px 28px",
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                color: "#B0AAA2",
                fontFamily: F,
                fontSize: 13,
                textAlign: "left",
                cursor: "pointer",
                marginBottom: 32,
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#8B7355";
                e.currentTarget.style.color = "#4A4A4A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E8E3DB";
                e.currentTarget.style.color = "#B0AAA2";
              }}
            >
              {t("community_write_prompt", lang)}
            </button>
          ) : (
            <div style={{ background: "#FFFFFF", border: "1px solid #E8E3DB", padding: 32, marginBottom: 32 }}>
              <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B7355", marginBottom: 20 }}>
                {t("community_new_post", lang)}
              </div>

              {/* Category selector */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setNewCategory(cat.key)}
                    style={{
                      padding: "6px 12px",
                      border: newCategory === cat.key ? "1px solid #8B7355" : "1px solid #E8E3DB",
                      background: newCategory === cat.key ? "rgba(139,115,85,0.08)" : "transparent",
                      color: newCategory === cat.key ? "#8B7355" : "#B0AAA2",
                      fontFamily: F,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    {cat.emoji} {categoryLabel(cat.key)}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder={t("community_title_placeholder", lang)}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  border: "none",
                  borderBottom: "1px solid #E8E3DB",
                  background: "transparent",
                  fontFamily: S,
                  fontSize: 22,
                  fontWeight: 400,
                  color: "#1A1A1A",
                  outline: "none",
                  marginBottom: 16,
                  boxSizing: "border-box",
                }}
              />

              <textarea
                placeholder={t("community_content_placeholder", lang)}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={6}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  border: "none",
                  borderBottom: "1px solid #E8E3DB",
                  background: "transparent",
                  fontFamily: F,
                  fontSize: 13,
                  color: "#4A4A4A",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.7,
                  marginBottom: 20,
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowNewPost(false); setNewTitle(""); setNewContent(""); }}
                  style={{ padding: "10px 24px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  {t("cancel", lang)}
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={posting || !newTitle.trim() || !newContent.trim()}
                  style={{
                    padding: "10px 24px",
                    border: "1px solid #1A1A1A",
                    background: "#1A1A1A",
                    color: "#FDFBF7",
                    fontFamily: F,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: posting ? "wait" : "pointer",
                    opacity: (!newTitle.trim() || !newContent.trim()) ? 0.4 : 1,
                  }}
                >
                  {posting ? t("community_posting", lang) : t("community_publish", lang)}
                </button>
              </div>
            </div>
          )
        ) : (
          <div
            onClick={() => router.push("/login")}
            style={{
              width: "100%",
              padding: "20px 28px",
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              fontFamily: F,
              fontSize: 13,
              color: "#8B7355",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 32,
              boxSizing: "border-box",
            }}
          >
            {t("community_login_to_post", lang)}
          </div>
        )}

        {/* Posts Feed */}
        {loading ? (
          <PostSkeleton count={3} />
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 64, color: "#B0AAA2", fontFamily: F, fontSize: 13 }}>
            {t("community_no_posts", lang)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {posts.map((post) => (
              <article
                key={post.id}
                style={{
                  background: "#FFFFFF",
                  border: post.pinned ? "1px solid #8B7355" : "1px solid #E8E3DB",
                  padding: 32,
                  transition: "all 0.3s ease",
                }}
              >
                {/* Post header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: post.authorRole === "artist" ? "#F0EBE3" : "#E8E3DB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: F,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#8B7355",
                    }}>
                      {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#1A1A1A", letterSpacing: "0.02em" }}>
                        {post.authorName}
                      </div>
                      <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginTop: 2 }}>
                        {post.authorRole === "artist" ? t("artist", lang) : t("gallery", lang)} · {timeAgo(post.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {post.pinned && (
                      <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", padding: "4px 8px", border: "1px solid #8B7355" }}>
                        {t("community_pinned", lang)}
                      </span>
                    )}
                    <span style={{
                      fontFamily: F,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#B0AAA2",
                      padding: "4px 10px",
                      border: "1px solid #E8E3DB",
                    }}>
                      {categoryLabel(post.category)}
                    </span>
                  </div>
                </div>

                {/* Post content */}
                <h2 style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#1A1A1A", margin: "0 0 12px", lineHeight: 1.3 }}>
                  {translations[post.id]?.title || post.title}
                </h2>
                <div style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 12 }}>
                  {translations[post.id]?.content || post.content}
                </div>
                {/* Translate button */}
                <button
                  onClick={() => translatePost(post)}
                  disabled={translations[post.id]?.loading}
                  style={{
                    padding: "4px 12px",
                    border: "1px solid #E8E3DB",
                    background: translations[post.id]?.title ? "rgba(139,115,85,0.08)" : "transparent",
                    color: translations[post.id]?.title ? "#8B7355" : "#B0AAA2",
                    fontFamily: F,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    cursor: translations[post.id]?.loading ? "wait" : "pointer",
                    marginBottom: 16,
                    transition: "all 0.2s",
                  }}
                >
                  {translations[post.id]?.loading
                    ? (lang === "ko" ? "번역 중..." : "Translating...")
                    : translations[post.id]?.title
                      ? (lang === "ko" ? "원문 보기" : "Show original")
                      : (lang === "ko" ? "🌐 번역" : "🌐 Translate")}
                </button>

                {/* Actions bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 24, paddingTop: 16, borderTop: "1px solid #F0EBE3" }}>
                  <button
                    onClick={() => handleLike(post.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 0",
                      border: "none",
                      background: "transparent",
                      color: post.liked ? "#8B7355" : "#B0AAA2",
                      fontFamily: F,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => { if (!post.liked) e.currentTarget.style.color = "#8B7355"; }}
                    onMouseLeave={(e) => { if (!post.liked) e.currentTarget.style.color = "#B0AAA2"; }}
                  >
                    <span style={{ fontSize: 14 }}>{post.liked ? "♥" : "♡"}</span>
                    <span>{post.likeCount}</span>
                  </button>

                  <button
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 0",
                      border: "none",
                      background: "transparent",
                      color: "#B0AAA2",
                      fontFamily: F,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#8B7355"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#B0AAA2"; }}
                  >
                    <span style={{ fontSize: 14 }}>💬</span>
                    <span>{post.commentCount} {t("community_comments", lang)}</span>
                  </button>
                </div>

                {/* Comments section */}
                {expandedPostId === post.id && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F0EBE3" }}>
                    {post.comments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                        {post.comments.map((comment) => (
                          <div key={comment.id} style={{ paddingLeft: 16, borderLeft: "2px solid #F0EBE3" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "#F0EBE3",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontFamily: F,
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#8B7355",
                              }}>
                                {comment.authorName.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: "#1A1A1A" }}>
                                {comment.authorName}
                              </span>
                              <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
                                · {timeAgo(comment.createdAt)}
                              </span>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <input value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8E3DB", fontFamily: F, fontSize: 12, outline: "none" }} />
                                <button onClick={() => handleEditComment(post.id, comment.id)} style={{ padding: "8px 14px", background: "#1A1A1A", color: "#FDFBF7", border: "none", fontFamily: F, fontSize: 10, cursor: "pointer" }}>저장</button>
                                <button onClick={() => setEditingCommentId(null)} style={{ padding: "8px 14px", background: "transparent", color: "#8A8580", border: "1px solid #E8E3DB", fontFamily: F, fontSize: 10, cursor: "pointer" }}>취소</button>
                              </div>
                            ) : (
                              <p style={{ fontFamily: F, fontSize: 12, color: "#4A4A4A", lineHeight: 1.6, margin: 0 }}>
                                {translations[post.id]?.comments?.[comment.id] || comment.content}
                                {session?.userId === comment.authorId && (
                                  <span style={{ marginLeft: 10 }}>
                                    <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }} style={{ background: "none", border: "none", fontFamily: F, fontSize: 10, color: "#B0AAA2", cursor: "pointer" }}>수정</button>
                                    <button onClick={() => handleDeleteComment(post.id, comment.id)} style={{ background: "none", border: "none", fontFamily: F, fontSize: 10, color: "#B0AAA2", cursor: "pointer", marginLeft: 6 }}>삭제</button>
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment input */}
                    {session ? (
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <input
                          type="text"
                          placeholder={t("community_write_comment", lang)}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && commentText.trim()) handleComment(post.id); }}
                          style={{
                            flex: 1,
                            padding: "12px 16px",
                            border: "1px solid #E8E3DB",
                            background: "transparent",
                            fontFamily: F,
                            fontSize: 12,
                            color: "#1A1A1A",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={commenting || !commentText.trim()}
                          style={{
                            padding: "12px 20px",
                            border: "1px solid #1A1A1A",
                            background: "#1A1A1A",
                            color: "#FDFBF7",
                            fontFamily: F,
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            cursor: commenting ? "wait" : "pointer",
                            opacity: !commentText.trim() ? 0.4 : 1,
                          }}
                        >
                          {t("community_reply", lang)}
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => router.push("/login")}
                        style={{ fontFamily: F, fontSize: 12, color: "#8B7355", cursor: "pointer", textAlign: "center", padding: 12 }}
                      >
                        {t("community_login_to_comment", lang)}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
