"use client";

import { F, colors } from "@/lib/design";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: string;
  onChooseRitual: () => void;
  onChooseArtwork: () => void;
};

export default function CreateChoiceModal({ open, onClose, lang, onChooseRitual, onChooseArtwork }: Props) {
  const ko = lang === "ko";
  if (!open) return null;

  const optionStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "16px",
    border: `1px solid ${colors.border}`,
    background: colors.bgCard,
    textAlign: "left",
    cursor: "pointer",
    marginBottom: 10,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 max(16px, env(safe-area-inset-bottom))" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 520, background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: "12px 12px 0 0", padding: "16px 16px 20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textPrimary }}>
            {ko ? "무엇을 올릴까요?" : "What would you like to share?"}
          </span>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: colors.textMuted }}>×</button>
        </div>

        <button
          type="button"
          style={optionStyle}
          onClick={() => {
            onClose();
            onChooseRitual();
          }}
        >
          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: colors.textPrimary, marginBottom: 6 }}>
            {ko ? "작업 과정 기록" : "Practice log"}
          </div>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            {ko
              ? "지금 작업 중인 순간을 남깁니다. 작업 과정 기록은 피드에 반영되지 않습니다."
              : "Capture a moment while you work. Practice logs do not appear in the main feed."}
          </p>
        </button>

        <button
          type="button"
          style={{ ...optionStyle, marginBottom: 0 }}
          onClick={() => {
            onClose();
            onChooseArtwork();
          }}
        >
          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: colors.textPrimary, marginBottom: 6 }}>
            {ko ? "완료작업 업로드" : "Upload finished work"}
          </div>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            {ko
              ? "완성된 작업이나 전시 기록을 올립니다. 둘러보기 피드와 포트폴리오에 표시됩니다."
              : "Share finished work or exhibitions. Appears in the feed and your portfolio."}
          </p>
        </button>
      </div>
    </div>
  );
}
