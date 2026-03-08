"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";

type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: number;
};

type Post = {
  id: string;
  authorName: string;
  authorRole: string;
  category: string;
  title: string;
  content: string;
  commentCount: number;
  comments: Comment[];
  createdAt: number;
};

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "find_collab", label: "콜라보 찾기" },
  { key: "art_chat", label: "아트 챗" },
  { key: "meetup", label: "밋업" },
];

export default function AdminCommunityPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (data?.authenticated) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          router.replace("/admin/login");
        }
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;
    fetchPosts();
  }, [authenticated, category]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const url = category === "all"
        ? "/api/community/posts?limit=50"
        : `/api/community/posts?limit=50&category=${category}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleComment(postId: string) {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setSubmitting(postId);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, content }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        setMsg("댓글이 등록되었습니다.");
        if (data.post) {
          setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...data.post } : p));
        }
      } else {
        setMsg("등록 실패: " + (data.error || "오류"));
      }
    } catch {
      setMsg("등록 실패");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    if (!window.confirm("이 댓글을 삭제하시겠습니까?")) return;
    setMsg(null);
    try {
      const res = await fetch("/api/admin/community", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("댓글이 삭제되었습니다.");
        if (data.post) {
          setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...data.post } : p));
        }
      } else {
        setMsg("삭제 실패: " + (data.error || "오류"));
      }
    } catch {
      setMsg("삭제 실패");
    }
  }

  function timeAgo(ts: number) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  }

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>인증 중...</p>
      </main>
    );
  }
  if (!authenticated) return null;

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Admin
          </span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 6 }}>
            커뮤니티 관리
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 6 }}>
            "관리자" 이름으로 댓글을 달거나, 사용자 댓글을 삭제할 수 있습니다.
          </p>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                padding: "7px 16px",
                border: "1px solid " + (category === c.key ? "#1A1A1A" : "#E8E3DB"),
                background: category === c.key ? "#1A1A1A" : "transparent",
                color: category === c.key ? "#FDFBF7" : "#8A8580",
                fontFamily: F, fontSize: 11, cursor: "pointer",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ padding: "10px 16px", background: "#F0F7F0", border: "1px solid #C0DCC0", fontFamily: F, fontSize: 12, color: "#3A6A3A", marginBottom: 16 }}>
            {msg}
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>불러오는 중...</p>
        ) : posts.length === 0 ? (
          <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>게시글이 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.map((post) => {
              const isExpanded = expandedPost === post.id;
              return (
                <div key={post.id} style={{ border: "1px solid #E8E3DB", background: "#FFFFFF" }}>
                  {/* Post header */}
                  <div
                    style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: F, fontSize: 10, color: "#8B7355", background: "#F7F4F0", padding: "2px 8px" }}>{post.category}</span>
                        <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580", fontWeight: 500 }}>{post.authorName}</span>
                        <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>· {timeAgo(post.createdAt)}</span>
                      </div>
                      <div style={{ fontFamily: F, fontSize: 14, color: "#1A1A1A", fontWeight: 500 }}>{post.title}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 16, flexShrink: 0 }}>
                      <span style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2" }}>댓글 {post.commentCount}</span>
                      <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded: comments + input */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #F0EDE8", padding: "16px 20px" }}>
                      <p style={{ fontFamily: F, fontSize: 12, color: "#4A4A4A", lineHeight: 1.7, marginBottom: 16 }}>{post.content}</p>

                      {/* Comments */}
                      {post.comments && post.comments.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                          {post.comments.map((c) => (
                            <div key={c.id} style={{ padding: "10px 14px", background: "#FDFBF7", border: "1px solid #F0EDE8" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: c.authorId === "admin" ? "#8B7355" : "#1A1A1A" }}>
                                  {c.authorName}
                                  {c.authorId === "admin" && <span style={{ marginLeft: 4, fontSize: 9, color: "#8B7355", background: "#F7F4F0", padding: "1px 5px" }}>관리자</span>}
                                </span>
                                <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>· {timeAgo(c.createdAt)}</span>
                                <button
                                  onClick={() => handleDeleteComment(post.id, c.id)}
                                  style={{ marginLeft: "auto", background: "none", border: "none", fontFamily: F, fontSize: 10, color: "#C44444", cursor: "pointer", padding: 0 }}
                                >
                                  삭제
                                </button>
                              </div>
                              <p style={{ fontFamily: F, fontSize: 12, color: "#4A4A4A", margin: 0 }}>{c.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Admin comment input */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px dashed #E8E3DB", paddingTop: 14 }}>
                        <span style={{ fontFamily: F, fontSize: 10, color: "#8B7355", whiteSpace: "nowrap", background: "#F7F4F0", padding: "4px 10px" }}>관리자</span>
                        <input
                          type="text"
                          placeholder="댓글 입력..."
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") handleComment(post.id); }}
                          style={{ flex: 1, padding: "9px 12px", border: "1px solid #E8E3DB", fontFamily: F, fontSize: 12, outline: "none", background: "#FDFBF7" }}
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={submitting === post.id || !commentInputs[post.id]?.trim()}
                          style={{
                            padding: "9px 18px",
                            border: "none",
                            background: submitting === post.id ? "#8A8580" : "#1A1A1A",
                            color: "#FDFBF7",
                            fontFamily: F, fontSize: 10, fontWeight: 500,
                            letterSpacing: "0.08em", textTransform: "uppercase",
                            cursor: submitting === post.id ? "wait" : "pointer",
                            opacity: !commentInputs[post.id]?.trim() ? 0.4 : 1,
                          }}
                        >
                          {submitting === post.id ? "..." : "등록"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
