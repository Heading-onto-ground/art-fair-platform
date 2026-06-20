"use client";

import { useRef, useState } from "react";
import { F, colors } from "@/lib/design";
import { resizeImage } from "@/lib/artworkImageUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: string;
  onPosted?: () => void;
};

const STATES = [
  "working",
  "thinking",
  "stuck",
  "experimenting",
  "exploring",
  "refining",
  "destroying",
  "restarting",
] as const;

const MEDIA = [
  "painting",
  "drawing",
  "sculpture",
  "writing",
  "music",
  "photography",
  "mixed media",
] as const;

const STATE_LABELS: Record<string, { ko: string; en: string }> = {
  working: { ko: "작업 중", en: "Working" },
  thinking: { ko: "고민 중", en: "Thinking" },
  stuck: { ko: "막힘", en: "Stuck" },
  experimenting: { ko: "실험 중", en: "Experimenting" },
  exploring: { ko: "탐색 중", en: "Exploring" },
  refining: { ko: "다듬는 중", en: "Refining" },
  destroying: { ko: "부수는 중", en: "Destroying" },
  restarting: { ko: "다시 시작", en: "Restarting" },
};

const MEDIUM_LABELS: Record<string, { ko: string; en: string }> = {
  painting: { ko: "회화", en: "Painting" },
  drawing: { ko: "드로잉", en: "Drawing" },
  sculpture: { ko: "조각", en: "Sculpture" },
  writing: { ko: "글", en: "Writing" },
  music: { ko: "음악", en: "Music" },
  photography: { ko: "사진", en: "Photography" },
  "mixed media": { ko: "혼합매체", en: "Mixed media" },
};

export default function RitualComposerModal({ open, onClose, lang, onPosted }: Props) {
  const ko = lang === "ko";
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<(typeof STATES)[number]>("working");
  const [medium, setMedium] = useState<(typeof MEDIA)[number]>("painting");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setPreview(null);
    setNote("");
    setState("working");
    setMedium("painting");
    setError(null);
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
      setError(ko ? "이미지 파일만 가능합니다." : "Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(ko ? "이미지가 너무 큽니다 (최대 8MB)." : "Image too large (max 8MB).");
      return;
    }
    try {
      setPreview(await resizeImage(file, 1200, 1200, 0.8));
    } catch {
      setError(ko ? "이미지 처리 실패" : "Failed to process image");
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function save() {
    if (!preview || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/artist/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl: preview, note: note.trim() || null, state, medium }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || (ko ? "기록 실패" : "Failed to record"));
        return;
      }
      reset();
      onPosted?.();
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "7px 12px",
    border: `1px solid ${active ? colors.textPrimary : colors.border}`,
    background: active ? colors.textPrimary : "transparent",
    color: active ? colors.bgPrimary : colors.textSecondary,
    fontFamily: F,
    fontSize: 11,
    cursor: "pointer",
    borderRadius: 999,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 max(16px, env(safe-area-inset-bottom))" }}
      onClick={handleClose}
    >
      <div
        style={{ width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: "12px 12px 0 0" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${colors.borderLight}` }}>
          <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textPrimary }}>
            {ko ? "오늘의 작업 기록" : "Today's practice"}
          </span>
          <button type="button" onClick={handleClose} style={{ border: "none", background: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: colors.textMuted }}>×</button>
        </div>

        {preview ? (
          <div style={{ position: "relative", aspectRatio: "1", background: "#000" }}>
            <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            <button type="button" onClick={() => setPreview(null)} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} style={{ width: "100%", aspectRatio: "1", maxHeight: 260, border: "none", background: colors.bgAccent, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 44, color: colors.textLight }}>+</span>
            <span style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {ko ? "작업 사진" : "Studio photo"}
            </span>
          </button>
        )}

        <div style={{ padding: 16 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={ko ? "지금 무엇을 하고 있나요? (선택)" : "What are you working on? (optional)"}
            rows={2}
            maxLength={500}
            style={{ width: "100%", padding: "12px 0", border: "none", borderTop: `1px solid ${colors.borderLight}`, borderBottom: `1px solid ${colors.borderLight}`, background: "transparent", fontFamily: F, fontSize: 14, color: colors.textPrimary, resize: "none", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }}
          />

          <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textMuted, margin: "16px 0 8px" }}>
            {ko ? "상태" : "State"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STATES.map((s) => (
              <button key={s} type="button" onClick={() => setState(s)} style={chip(state === s)}>
                {ko ? STATE_LABELS[s].ko : STATE_LABELS[s].en}
              </button>
            ))}
          </div>

          <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textMuted, margin: "16px 0 8px" }}>
            {ko ? "매체" : "Medium"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MEDIA.map((m) => (
              <button key={m} type="button" onClick={() => setMedium(m)} style={chip(medium === m)}>
                {ko ? MEDIUM_LABELS[m].ko : MEDIUM_LABELS[m].en}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={save}
            disabled={!preview || saving}
            style={{ width: "100%", marginTop: 20, padding: "12px", border: "none", background: !preview || saving ? colors.border : colors.accent, color: colors.bgPrimary, fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: !preview || saving ? "not-allowed" : "pointer" }}
          >
            {saving ? (ko ? "기록 중…" : "Saving…") : ko ? "기록하기" : "Record"}
          </button>

          {error && <p style={{ fontFamily: F, fontSize: 11, color: colors.error, marginTop: 12, marginBottom: 0 }}>{error}</p>}
        </div>

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: "none" }} />
      </div>
    </div>
  );
}

export { STATE_LABELS, MEDIUM_LABELS };
