"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { F, colors } from "@/lib/design";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";
import type { ArtworkEngagement, ArtworkCommentView } from "@/lib/artworkEngagement";

type Props = {
  artworkId: string;
  lang: string;
  isLoggedIn: boolean;
};

export default function ArtworkEngagementPanel({ artworkId, lang, isLoggedIn }: Props) {
  const ko = lang === "ko";
  const router = useRouter();
  const [engagement, setEngagement] = useState<ArtworkEngagement | null>(null);
  const [comments, setComments] = useState<ArtworkCommentView[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [engRes, comRes] = await Promise.all([
        fetch(`/api/artworks/${artworkId}/engagement`, { cache: "no-store" }),
        fetch(`/api/artworks/${artworkId}/comments`, { cache: "no-store" }),
      ]);
      const engData = await engRes.json().catch(() => null);
      const comData = await comRes.json().catch(() => null);
      if (engRes.ok && engData) setEngagement(engData);
      if (comRes.ok && comData?.comments) setComments(comData.comments);
    } finally {
      setLoading(false);
    }
  }, [artworkId]);

  useEffect(() => {
    load();
  }, [load]);

  function requireLogin(): boolean {
    if (isLoggedIn) return true;
    router.push(`/login?role=artist&redirect=${encodeURIComponent("/")}`);
    return false;
  }

  async function toggle(action: "like" | "collab") {
    if (!requireLogin()) return;
    setActing(action);
    try {
      const res = await fetch(`/api/artworks/${artworkId}/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.engagement) setEngagement(data.engagement);
    } finally {
      setActing(null);
    }
  }

  async function submitComment() {
    if (!requireLogin()) return;
    if (!commentText.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/artworks/${artworkId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.comment) {
        setComments((prev) => [...prev, data.comment]);
        setCommentText("");
        setShowComments(true);
        setEngagement((prev) =>
          prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev,
        );
      }
    } finally {
      setPosting(false);
    }
  }

  const btn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    border: `1px solid ${active ? colors.accent : colors.border}`,
    background: active ? "rgba(139,115,85,0.08)" : "transparent",
    color: active ? colors.accent : colors.textSecondary,
    fontFamily: F,
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    cursor: acting ? "wait" : "pointer",
    borderRadius: 0,
  });

  if (loading && !engagement) {
    return <p style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, padding: "8px 0" }}>{ko ? "불러오는 중…" : "Loading…"}</p>;
  }

  const e = engagement ?? {
    likeCount: 0,
    collabCount: 0,
    commentCount: 0,
    liked: false,
    collabInterested: false,
  };

  return (
    <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button type="button" style={btn(e.liked)} disabled={!!acting} onClick={() => toggle("like")}>
          <span>{e.liked ? "♥" : "♡"}</span>
          <span>{ko ? "좋아요" : "Like"}</span>
          {e.likeCount > 0 && <span style={{ color: colors.textMuted }}>{e.likeCount}</span>}
        </button>
        <button type="button" style={btn(e.collabInterested)} disabled={!!acting} onClick={() => toggle("collab")}>
          <span>✦</span>
          <span>{ko ? "콜라보하고 싶을 만큼 좋아요" : "Collab interest"}</span>
          {e.collabCount > 0 && <span style={{ color: colors.textMuted }}>{e.collabCount}</span>}
        </button>
        <button
          type="button"
          style={btn(showComments)}
          onClick={() => {
            setShowComments((v) => !v);
          }}
        >
          <span>💬</span>
          <span>{ko ? "댓글" : "Comment"}</span>
          {e.commentCount > 0 && <span style={{ color: colors.textMuted }}>{e.commentCount}</span>}
        </button>
      </div>

      {(showComments || comments.length > 0) && (
        <div style={{ marginBottom: 12 }}>
          {comments.length === 0 ? (
            <p style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, margin: "0 0 10px" }}>
              {ko ? "첫 댓글을 남겨보세요." : "Be the first to comment."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
              {comments.map((c) => (
                <div key={c.id}>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: colors.textPrimary }}>
                    {c.authorName}
                    <span style={{ fontWeight: 400, color: colors.textLight, marginLeft: 8, fontSize: 10 }}>
                      {artworkTimeAgo(c.createdAt, lang)}
                    </span>
                  </div>
                  <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: "4px 0 0", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={commentText}
          onChange={(ev) => setCommentText(ev.target.value)}
          placeholder={ko ? "댓글 달기…" : "Add a comment…"}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && !ev.shiftKey) {
              ev.preventDefault();
              submitComment();
            }
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: `1px solid ${colors.border}`,
            background: colors.bgPrimary,
            fontFamily: F,
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={submitComment}
          disabled={posting || !commentText.trim()}
          style={{
            padding: "10px 16px",
            border: "none",
            background: posting || !commentText.trim() ? colors.border : colors.textPrimary,
            color: colors.bgPrimary,
            fontFamily: F,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: posting || !commentText.trim() ? "not-allowed" : "pointer",
          }}
        >
          {posting ? "…" : ko ? "게시" : "Post"}
        </button>
      </div>
    </div>
  );
}
