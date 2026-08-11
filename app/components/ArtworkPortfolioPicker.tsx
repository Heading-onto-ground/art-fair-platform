"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { F, S, colors } from "@/lib/design";
import HashtagText from "@/app/components/HashtagText";
import ArtworkImageCarousel from "@/app/components/ArtworkImageCarousel";
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
  const [batchWorking, setBatchWorking] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  // Tracks artwork ids with an in-flight toggle so rapid taps don't conflict
  const pendingIds = useRef<Set<string>>(new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag-to-reorder state for the portfolio order strip
  const [dragIds, setDragIds] = useState<string[] | null>(null);
  const dragIdsRef = useRef<string[] | null>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; active: boolean } | null>(null);

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

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  function showFlash(message: string) {
    setFlash(message);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2000);
  }

  function applyLocal(ids: string[], inPortfolio: boolean) {
    setArtworks((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, inPortfolio } : a)));
    setSelected((prev) => (prev && ids.includes(prev.id) ? { ...prev, inPortfolio } : prev));
  }

  /** Optimistic single toggle: flip immediately, revert on failure */
  async function togglePortfolio(item: ArtworkItem) {
    if (pendingIds.current.has(item.id)) return;
    pendingIds.current.add(item.id);
    const next = !item.inPortfolio;
    applyLocal([item.id], next);
    try {
      const res = await fetch("/api/artist/artworks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id, inPortfolio: next }),
      });
      if (res.ok) {
        onChanged?.();
        showFlash(
          next
            ? ko ? "포트폴리오에 추가됨" : "Added to portfolio"
            : ko ? "포트폴리오에서 제외됨" : "Removed from portfolio",
        );
      } else {
        applyLocal([item.id], !next);
        showFlash(ko ? "저장 실패, 다시 시도해주세요" : "Failed to save, please retry");
      }
    } catch {
      applyLocal([item.id], !next);
      showFlash(ko ? "저장 실패, 다시 시도해주세요" : "Failed to save, please retry");
    } finally {
      pendingIds.current.delete(item.id);
    }
  }

  /** Batch add/remove all */
  async function setAll(inPortfolio: boolean) {
    if (batchWorking) return;
    const ids = artworks.filter((a) => a.inPortfolio !== inPortfolio).map((a) => a.id);
    if (ids.length === 0) return;
    setBatchWorking(true);
    applyLocal(ids, inPortfolio);
    try {
      const res = await fetch("/api/artist/artworks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, inPortfolio }),
      });
      if (res.ok) {
        onChanged?.();
        showFlash(
          inPortfolio
            ? ko ? `${ids.length}점 모두 추가됨` : `Added all ${ids.length}`
            : ko ? `${ids.length}점 모두 제외됨` : `Removed all ${ids.length}`,
        );
      } else {
        applyLocal(ids, !inPortfolio);
        showFlash(ko ? "저장 실패, 다시 시도해주세요" : "Failed to save, please retry");
      }
    } catch {
      applyLocal(ids, !inPortfolio);
      showFlash(ko ? "저장 실패, 다시 시도해주세요" : "Failed to save, please retry");
    } finally {
      setBatchWorking(false);
    }
  }

  const selectedCount = artworks.filter((a) => a.inPortfolio).length;

  // Same ordering as the public portfolio: manual order first, then newest
  const portfolioItems = useMemo(
    () =>
      artworks
        .filter((a) => a.inPortfolio)
        .sort((a, b) => {
          const ao = a.portfolioOrder ?? Number.MAX_SAFE_INTEGER;
          const bo = b.portfolioOrder ?? Number.MAX_SAFE_INTEGER;
          if (ao !== bo) return ao - bo;
          return a.createdAt < b.createdAt ? 1 : -1;
        }),
    [artworks],
  );
  const artworkById = useMemo(() => new Map(artworks.map((a) => [a.id, a])), [artworks]);
  const orderIds = dragIds ?? portfolioItems.map((a) => a.id);

  async function saveOrder(ids: string[]) {
    try {
      const res = await fetch("/api/artist/artworks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderedIds: ids }),
      });
      if (res.ok) {
        setArtworks((prev) =>
          prev.map((a) => {
            const idx = ids.indexOf(a.id);
            return idx >= 0 ? { ...a, portfolioOrder: idx } : a;
          }),
        );
        onChanged?.();
        showFlash(ko ? "순서 저장됨" : "Order saved");
      } else {
        showFlash(ko ? "순서 저장 실패, 다시 시도해주세요" : "Failed to save order, please retry");
      }
    } catch {
      showFlash(ko ? "순서 저장 실패, 다시 시도해주세요" : "Failed to save order, please retry");
    }
  }

  function onDragPointerDown(e: React.PointerEvent, id: string) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { id, startX: e.clientX, startY: e.clientY, active: false };
  }

  function onDragPointerMove(e: React.PointerEvent) {
    const st = dragState.current;
    if (!st) return;
    if (!st.active) {
      if (Math.abs(e.clientX - st.startX) + Math.abs(e.clientY - st.startY) < 6) return;
      st.active = true;
      const ids = portfolioItems.map((a) => a.id);
      dragIdsRef.current = ids;
      setDragIds(ids);
    }
    const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest?.("[data-order-id]");
    const overId = over?.getAttribute("data-order-id");
    if (!overId || overId === st.id) return;
    const ids = (dragIdsRef.current ?? portfolioItems.map((a) => a.id)).slice();
    const from = ids.indexOf(st.id);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, st.id);
    dragIdsRef.current = ids;
    setDragIds(ids);
  }

  function onDragPointerUp() {
    const st = dragState.current;
    dragState.current = null;
    if (!st?.active) return;
    const ids = dragIdsRef.current;
    dragIdsRef.current = null;
    setDragIds(null);
    if (ids) saveOrder(ids);
  }

  const smallButton = (disabled: boolean): React.CSSProperties => ({
    padding: "7px 12px",
    border: `1px solid ${colors.border}`,
    background: "transparent",
    color: disabled ? colors.textLight : colors.textSecondary,
    fontFamily: F,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.accent, margin: "0 0 6px" }}>
          {ko ? "내 게시물" : "My posts"}
        </p>
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
          {ko
            ? "사진을 한 번 누르면 포트폴리오에 바로 추가·제외돼요. 선택한 작업은 공개 프로필 그리드에 보이고, PDF로도 만들 수 있어요. 자세히 보려면 사진의 ⓘ를 누르세요."
            : "Tap a photo to instantly add or remove it from your portfolio. Selected works appear on your profile grid and can be exported as a PDF. Tap ⓘ on a photo for details."}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            disabled={batchWorking || artworks.length === 0 || selectedCount === artworks.length}
            onClick={() => setAll(true)}
            style={smallButton(batchWorking || artworks.length === 0 || selectedCount === artworks.length)}
          >
            {ko ? "모두 추가" : "Add all"}
          </button>
          <button
            type="button"
            disabled={batchWorking || selectedCount === 0}
            onClick={() => setAll(false)}
            style={smallButton(batchWorking || selectedCount === 0)}
          >
            {ko ? "모두 해제" : "Clear all"}
          </button>
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
      </div>

      {flash && (
        <div
          role="status"
          style={{
            padding: "9px 14px",
            marginBottom: 12,
            background: colors.textPrimary,
            color: colors.bgPrimary,
            fontFamily: F,
            fontSize: 11,
          }}
        >
          {flash}
        </div>
      )}

      {portfolioItems.length > 1 && (
        <div style={{ marginBottom: 16, padding: "12px 14px", border: `1px solid ${colors.border}`, background: colors.bgCard }}>
          <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.accent, margin: "0 0 4px" }}>
            {ko ? "포트폴리오 순서" : "Portfolio order"}
          </p>
          <p style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, margin: "0 0 10px", lineHeight: 1.5 }}>
            {ko ? "썸네일을 끌어서 공개 포트폴리오와 PDF의 순서를 바꾸세요." : "Drag thumbnails to reorder your public portfolio and PDF."}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {orderIds.map((id, idx) => {
              const item = artworkById.get(id);
              if (!item) return null;
              const isDragging = dragState.current?.active && dragState.current.id === id;
              return (
                <div
                  key={id}
                  data-order-id={id}
                  onPointerDown={(e) => onDragPointerDown(e, id)}
                  onPointerMove={onDragPointerMove}
                  onPointerUp={onDragPointerUp}
                  onPointerCancel={onDragPointerUp}
                  style={{
                    position: "relative",
                    width: 60,
                    height: 60,
                    overflow: "hidden",
                    border: isDragging ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    opacity: isDragging ? 0.85 : 1,
                    cursor: "grab",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title || ""}
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                  />
                  <span style={{ position: "absolute", top: 2, left: 2, minWidth: 16, height: 16, padding: "0 3px", borderRadius: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontFamily: F, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <div key={a.id} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: colors.bgAccent }}>
              <button
                type="button"
                onClick={() => togglePortfolio(a)}
                aria-pressed={a.inPortfolio}
                aria-label={
                  a.inPortfolio
                    ? ko ? "포트폴리오에서 제외" : "Remove from portfolio"
                    : ko ? "포트폴리오에 추가" : "Add to portfolio"
                }
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  border: a.inPortfolio ? `2px solid ${colors.accent}` : "none",
                  cursor: "pointer",
                  background: "transparent",
                }}
              >
                <img
                  src={a.imageUrl}
                  alt={a.title || ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: a.inPortfolio ? 1 : 0.55 }}
                />
                {a.inPortfolio && (
                  <span style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: colors.success, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✓
                  </span>
                )}
                {(a.imageUrls?.length ?? 0) > 1 && (
                  <span style={{ position: "absolute", top: 6, left: 6, fontSize: 11, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>⧉</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelected(a)}
                aria-label={ko ? "자세히 보기" : "View details"}
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: 6,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  fontSize: 11,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                ⓘ
              </button>
            </div>
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
            <ArtworkImageCarousel images={selected.imageUrls?.length ? selected.imageUrls : [selected.imageUrl]} alt={selected.title || ""} />
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
                  cursor: "pointer",
                }}
              >
                {selected.inPortfolio
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
