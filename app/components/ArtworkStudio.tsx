"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { F, S, colors } from "@/lib/design";
import HashtagText from "@/app/components/HashtagText";
import type { ArtworkPostType } from "@/lib/artworkTypes";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";

export type ArtworkItem = {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  medium: string | null;
  postType: ArtworkPostType;
  isPublic: boolean;
  inPortfolio: boolean;
  seriesId: string | null;
  seriesTitle: string | null;
  hashtags: string[];
  createdAt: string;
};

type Props = {
  lang: string;
  onChanged?: () => void;
};

function resizeImage(file: File, maxW: number, maxH: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ko" ? "방금" : "Just now";
  if (mins < 60) return lang === "ko" ? `${mins}분 전` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "ko" ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ko" ? `${days}일 전` : `${days}d ago`;
}

export default function ArtworkStudio({ lang, onChanged }: Props) {
  const ko = lang === "ko";
  const inputRef = useRef<HTMLInputElement>(null);
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<ArtworkPostType>("work");
  const [error, setError] = useState<string | null>(null);
  const [lastNote, setLastNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/artist/artworks", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.artworks) setArtworks(data.artworks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(ko ? "이미지 파일만 업로드할 수 있습니다." : "Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(ko ? "이미지가 너무 큽니다 (최대 8MB)." : "Image too large (max 8MB).");
      return;
    }
    try {
      setPreview(await resizeImage(file, 1600, 1600, 0.88));
    } catch {
      setError(ko ? "이미지 처리 실패" : "Failed to process image");
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function postArtwork() {
    if (!preview || posting) return;
    setPosting(true);
    setError(null);
    setLastNote(null);
    try {
      const res = await fetch("/api/artist/artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl: preview, caption: caption.trim() || null, postType }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (data?.error === "free_plan_artwork_upload_daily_limit_reached") {
          setError(ko ? "오늘 업로드 한도에 도달했습니다." : "Daily upload limit reached.");
        } else {
          setError(data?.error || (ko ? "업로드 실패" : "Upload failed"));
        }
        return;
      }

      const notes: string[] = [];
      if (data.seriesAssignment?.seriesTitle) {
        notes.push(
          data.seriesAssignment.createdSeries
            ? ko
              ? `「${data.seriesAssignment.seriesTitle}」 시리즈 자동 생성`
              : `Auto-created series "${data.seriesAssignment.seriesTitle}"`
            : ko
              ? `「${data.seriesAssignment.seriesTitle}」 시리즈 연결`
              : `Linked to "${data.seriesAssignment.seriesTitle}"`,
        );
      }
      if (postType === "exhibition") {
        notes.push(ko ? "활동 타임라인에 전시 기록 추가됨" : "Added to activity timeline as exhibition");
      }
      if (data.artwork?.hashtags?.length) {
        notes.push(ko ? `태그: ${data.artwork.hashtags.map((t: string) => `#${t}`).join(" ")}` : `Tags: ${data.artwork.hashtags.map((t: string) => `#${t}`).join(" ")}`);
      }
      if (notes.length) setLastNote(notes.join(" · "));

      setPreview(null);
      setCaption("");
      setPostType("work");
      await load();
      onChanged?.();
    } finally {
      setPosting(false);
    }
  }

  async function togglePortfolio(id: string, inPortfolio: boolean) {
    const res = await fetch("/api/artist/artworks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, inPortfolio: !inPortfolio }),
    });
    if (res.ok) {
      await load();
      onChanged?.();
    }
  }

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px",
    border: `1px solid ${active ? colors.textPrimary : colors.border}`,
    background: active ? colors.textPrimary : "transparent",
    color: active ? colors.bgPrimary : colors.textSecondary,
    fontFamily: F,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
  });

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      {/* Composer — Instagram style */}
      <article style={{ border: `1px solid ${colors.border}`, background: colors.bgCard, marginBottom: 32, overflow: "hidden" }}>
        {preview ? (
          <div style={{ position: "relative", aspectRatio: "1", background: "#000" }}>
            <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            <button
              type="button"
              onClick={() => setPreview(null)}
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", fontSize: 16 }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{ width: "100%", aspectRatio: "1", maxHeight: 320, border: "none", background: colors.bgAccent, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <span style={{ fontSize: 40, color: colors.textLight }}>+</span>
            <span style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {ko ? "사진 선택" : "Select photo"}
            </span>
          </button>
        )}

        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button type="button" onClick={() => setPostType("work")} style={pill(postType === "work")}>
              {ko ? POST_TYPE_LABELS.work.ko : POST_TYPE_LABELS.work.en}
            </button>
            <button type="button" onClick={() => setPostType("exhibition")} style={pill(postType === "exhibition")}>
              {ko ? POST_TYPE_LABELS.exhibition.ko : POST_TYPE_LABELS.exhibition.en}
            </button>
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={
              postType === "exhibition"
                ? ko
                  ? "전시 제목, 공간, 기간… #서울 #개인전"
                  : "Exhibition title, venue, dates… #seoul #solo"
                : ko
                  ? "작업 제목, 재료, 맥락… #painting #memory"
                  : "Title, medium, context… #painting #memory"
            }
            rows={4}
            style={{
              width: "100%",
              padding: "12px 0",
              border: "none",
              borderTop: `1px solid ${colors.borderLight}`,
              borderBottom: `1px solid ${colors.borderLight}`,
              background: "transparent",
              fontFamily: F,
              fontSize: 14,
              color: colors.textPrimary,
              resize: "none",
              outline: "none",
              lineHeight: 1.65,
            }}
          />

          <p style={{ fontFamily: F, fontSize: 10, color: colors.textMuted, margin: "10px 0 0", lineHeight: 1.5 }}>
            {ko
              ? "#해시태그로 갤러리·큐레이터가 최신순 검색할 수 있어요. 포트폴리오에 자동 반영됩니다."
              : "Use #hashtags so galleries & curators can find your work (newest first). Auto-added to portfolio."}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12 }}>
            <Link href="/explore" style={{ fontFamily: F, fontSize: 10, color: colors.accent, textDecoration: "none" }}>
              {ko ? "해시태그 탐색 →" : "Explore hashtags →"}
            </Link>
            <button
              type="button"
              onClick={postArtwork}
              disabled={!preview || posting}
              style={{
                padding: "10px 28px",
                border: "none",
                background: !preview || posting ? colors.border : colors.accent,
                color: colors.bgPrimary,
                fontFamily: F,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: !preview || posting ? "not-allowed" : "pointer",
              }}
            >
              {posting ? (ko ? "공유 중…" : "Sharing…") : ko ? "공유" : "Share"}
            </button>
          </div>

          {error && <p style={{ fontFamily: F, fontSize: 11, color: colors.error, marginTop: 12, marginBottom: 0 }}>{error}</p>}
          {lastNote && <p style={{ fontFamily: F, fontSize: 11, color: colors.success, marginTop: 12, marginBottom: 0 }}>{lastNote}</p>}
        </div>

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: "none" }} />
      </article>

      {/* My feed */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.accent }}>
          {ko ? "내 피드" : "My feed"} <span style={{ color: colors.textMuted, fontWeight: 400 }}>{artworks.length}</span>
        </span>
      </div>

      {loading ? (
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted }}>{ko ? "불러오는 중…" : "Loading…"}</p>
      ) : artworks.length === 0 ? (
        <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, textAlign: "center", padding: "32px 0" }}>
          {ko ? "첫 작업을 공유해보세요." : "Share your first post."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {artworks.map((a) => (
            <article key={a.id} style={{ border: `1px solid ${colors.border}`, background: colors.bgCard, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${colors.borderLight}` }}>
                <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: a.postType === "exhibition" ? colors.success : colors.accent }}>
                  {ko ? POST_TYPE_LABELS[a.postType].ko : POST_TYPE_LABELS[a.postType].en}
                </span>
                <span style={{ fontFamily: F, fontSize: 10, color: colors.textLight }}>{timeAgo(a.createdAt, lang)}</span>
              </div>
              <div style={{ aspectRatio: "1", background: colors.bgAccent }}>
                <img src={a.imageUrl} alt={a.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: "12px 14px 14px" }}>
                {a.title && <div style={{ fontFamily: S, fontSize: 15, marginBottom: 6, color: colors.textPrimary }}>{a.title}</div>}
                {a.caption && (
                  <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, margin: "0 0 10px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    <HashtagText text={a.caption} />
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {a.seriesTitle && (
                    <span style={{ fontFamily: F, fontSize: 10, padding: "3px 8px", background: "rgba(139,115,85,0.08)", color: colors.accent }}>{a.seriesTitle}</span>
                  )}
                  {a.inPortfolio ? (
                    <span style={{ fontFamily: F, fontSize: 10, color: colors.success }}>{ko ? "포트폴리오 ✓" : "Portfolio ✓"}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => togglePortfolio(a.id, a.inPortfolio)}
                    style={{ marginLeft: "auto", padding: 0, border: "none", background: "none", fontFamily: F, fontSize: 10, color: colors.textMuted, cursor: "pointer", textDecoration: "underline" }}
                  >
                    {a.inPortfolio ? (ko ? "포트폴리오 제외" : "Hide") : (ko ? "포트폴리오 포함" : "Show")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
