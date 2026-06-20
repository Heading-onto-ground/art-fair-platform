"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { F, colors } from "@/lib/design";
import { fileToDataUrl } from "@/lib/imageCrop";
import ImageCropEditor from "@/app/components/ImageCropEditor";
import type { ArtworkPostType } from "@/lib/artworkTypes";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";

type Props = {
  lang: string;
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
};

export default function ArtworkUploadModal({ lang, open, onClose, onPosted }: Props) {
  const ko = lang === "ko";
  const inputRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);
  const [rawSource, setRawSource] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<ArtworkPostType>("work");
  const [error, setError] = useState<string | null>(null);
  const [lastNote, setLastNote] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setRawSource(null);
    setEditing(false);
    setPreview(null);
    setCaption("");
    setPostType("work");
    setError(null);
    setLastNote(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

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
      const dataUrl = await fileToDataUrl(file);
      setRawSource(dataUrl);
      setPreview(null);
      setEditing(true);
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
        notes.push(
          ko
            ? `태그: ${data.artwork.hashtags.map((t: string) => `#${t}`).join(" ")}`
            : `Tags: ${data.artwork.hashtags.map((t: string) => `#${t}`).join(" ")}`,
        );
      }
      notes.push(ko ? "마이페이지에서 포트폴리오에 추가할 수 있어요" : "Add to portfolio from My Page");
      if (notes.length) setLastNote(notes.join(" · "));

      reset();
      onPosted?.();
      setTimeout(handleClose, 600);
    } finally {
      setPosting(false);
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
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 max(16px, env(safe-area-inset-bottom))",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: "12px 12px 0 0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${colors.borderLight}` }}>
          <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textPrimary }}>
            {ko ? "새 게시물" : "New post"}
          </span>
          <button type="button" onClick={handleClose} style={{ border: "none", background: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: colors.textMuted }}>
            ×
          </button>
        </div>

        {editing && (rawSource || preview) ? (
          <ImageCropEditor
            src={rawSource || preview!}
            lang={lang}
            outputMax={1600}
            quality={0.88}
            onApply={(dataUrl) => {
              setPreview(dataUrl);
              setEditing(false);
            }}
            onCancel={() => {
              setRawSource(null);
              setEditing(false);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
        ) : preview ? (
          <div style={{ position: "relative", aspectRatio: "1", background: "#000" }}>
            <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{ position: "absolute", bottom: 12, left: 12, padding: "6px 12px", border: "none", borderRadius: 999, background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontFamily: F, fontSize: 11 }}
            >
              {ko ? "크기 조절" : "Adjust"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setRawSource(null);
              }}
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", fontSize: 16 }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{ width: "100%", aspectRatio: "1", maxHeight: 280, border: "none", background: colors.bgAccent, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <span style={{ fontSize: 44, color: colors.textLight }}>+</span>
            <span style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {ko ? "사진 선택" : "Select photo"}
            </span>
          </button>
        )}

        <div style={{ padding: 16 }}>
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
              ? "#해시태그로 검색됩니다. 포트폴리오 공개는 마이페이지에서 선택하세요."
              : "Use #hashtags for discovery. Choose portfolio visibility in My Page."}
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
      </div>
    </div>
  );
}
