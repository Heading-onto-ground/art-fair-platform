"use client";

import { useCallback, useEffect, useState } from "react";
import { F, S, colors } from "@/lib/design";
import HashtagText from "@/app/components/HashtagText";
import type { ArtworkItem } from "@/lib/artworkTypes";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";

type Props = {
  lang: string;
  onChanged?: () => void;
};

export default function ArtworkPortfolioPicker({ lang, onChanged }: Props) {
  const ko = lang === "ko";
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ArtworkItem | null>(null);
  const [toggling, setToggling] = useState(false);

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

  async function togglePortfolio(item: ArtworkItem) {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch("/api/artist/artworks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id, inPortfolio: !item.inPortfolio }),
      });
      if (res.ok) {
        await load();
        onChanged?.();
        setSelected((prev) =>
          prev?.id === item.id ? { ...prev, inPortfolio: !item.inPortfolio } : prev,
        );
      }
    } finally {
      setToggling(false);
    }
  }

  const selectedCount = artworks.filter((a) => a.inPortfolio).length;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.accent, margin: "0 0 6px" }}>
          {ko ? "내 게시물" : "My posts"}
        </p>
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
          {ko
            ? "사진을 눌러 공개 포트폴리오에 포함·제외하세요. 선택한 작업은 공개 프로필 그리드에 보이고, PDF로도 만들 수 있어요."
            : "Tap a photo to add or remove it from your public portfolio. Selected works appear on your profile grid and can be exported as a PDF."}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 14px",
          marginBottom: 16,
          border: `1px solid ${colors.border}`,
          background: colors.bgAccent,
        }}
      >
        <span style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary }}>
          {ko ? `포트폴리오에 ${selectedCount}점 선택됨` : `${selectedCount} selected`}
        </span>
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={() => window.open("/artist/portfolio/print", "_blank", "noopener")}
          style={{
            padding: "9px 16px",
            border: "none",
            background: selectedCount === 0 ? colors.border : colors.textPrimary,
            color: selectedCount === 0 ? colors.textMuted : colors.bgPrimary,
            fontFamily: F,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: selectedCount === 0 ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {ko ? "PDF 만들기" : "Make PDF"}
        </button>
      </div>

      {loading ? (
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted }}>{ko ? "불러오는 중…" : "Loading…"}</p>
      ) : artworks.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center", border: `1px dashed ${colors.border}`, background: colors.bgAccent }}>
          <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, margin: 0 }}>
            {ko ? "아직 올린 작업이 없어요. 홈에서 + 버튼으로 올려보세요." : "No posts yet. Use + on the home feed to share."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
          {artworks.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a)}
              style={{
                position: "relative",
                aspectRatio: "1",
                padding: 0,
                border: selected?.id === a.id ? `2px solid ${colors.accent}` : "none",
                cursor: "pointer",
                overflow: "hidden",
                background: colors.bgAccent,
              }}
            >
              <img src={a.imageUrl} alt={a.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: a.inPortfolio ? 1 : 0.55 }} />
              {a.inPortfolio && (
                <span style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: colors.success, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", background: colors.bgCard, border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ aspectRatio: "1", background: "#111" }}>
              <img src={selected.imageUrl} alt={selected.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent }}>
                  {ko ? POST_TYPE_LABELS[selected.postType].ko : POST_TYPE_LABELS[selected.postType].en}
                </span>
                <span style={{ fontFamily: F, fontSize: 10, color: colors.textLight }}>{artworkTimeAgo(selected.createdAt, lang)}</span>
              </div>
              {selected.title && <div style={{ fontFamily: S, fontSize: 16, marginBottom: 8 }}>{selected.title}</div>}
              {selected.caption && (
                <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, margin: "0 0 16px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  <HashtagText text={selected.caption} />
                </p>
              )}
              <button
                type="button"
                disabled={toggling}
                onClick={() => togglePortfolio(selected)}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  border: "none",
                  background: selected.inPortfolio ? colors.border : colors.textPrimary,
                  color: selected.inPortfolio ? colors.textSecondary : colors.bgPrimary,
                  fontFamily: F,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: toggling ? "wait" : "pointer",
                }}
              >
                {toggling
                  ? "..."
                  : selected.inPortfolio
                    ? ko
                      ? "포트폴리오에서 제외"
                      : "Remove from portfolio"
                    : ko
                      ? "포트폴리오에 추가"
                      : "Add to portfolio"}
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ width: "100%", marginTop: 8, padding: "10px", border: "none", background: "transparent", fontFamily: F, fontSize: 11, color: colors.textMuted, cursor: "pointer" }}
              >
                {ko ? "닫기" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
