"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { F, colors } from "@/lib/design";
import { coverScale, exportCroppedImage, type CropTransform } from "@/lib/imageCrop";

type Props = {
  src: string;
  lang: string;
  outputMax?: number;
  quality?: number;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
};

export default function ImageCropEditor({ src, lang, outputMax = 1600, quality = 0.88, onApply, onCancel }: Props) {
  const ko = lang === "ko";
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState(320);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const [transform, setTransform] = useState<CropTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.width, h: img.height });
    img.src = src;
  }, [src]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewSize(el.clientWidth));
    ro.observe(el);
    setViewSize(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const base = coverScale(imgSize.w, imgSize.h, viewSize, viewSize);
  const displayScale = base * transform.scale;
  const dispW = imgSize.w * displayScale;
  const dispH = imgSize.h * displayScale;

  const clampOffset = useCallback(
    (ox: number, oy: number, scale: number) => {
      const s = base * scale;
      const dw = imgSize.w * s;
      const dh = imgSize.h * s;
      const maxX = Math.max(0, (dw - viewSize) / 2);
      const maxY = Math.max(0, (dh - viewSize) / 2);
      return {
        offsetX: Math.min(maxX, Math.max(-maxX, ox)),
        offsetY: Math.min(maxY, Math.max(-maxY, oy)),
      };
    },
    [base, imgSize.w, imgSize.h, viewSize],
  );

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: transform.offsetX, oy: transform.offsetY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const next = clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, transform.scale);
    setTransform((t) => ({ ...t, ...next }));
  }

  function onPointerUp() {
    setDragging(false);
  }

  function onZoomChange(scale: number) {
    const next = clampOffset(transform.offsetX, transform.offsetY, scale);
    setTransform({ scale, ...next });
  }

  async function apply() {
    setApplying(true);
    try {
      const out = await exportCroppedImage(src, viewSize, transform, outputMax, quality);
      onApply(out);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={{ background: "#000" }}>
      <div
        ref={viewportRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1",
          overflow: "hidden",
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: dispW,
            height: dispH,
            transform: `translate(calc(-50% + ${transform.offsetX}px), calc(-50% + ${transform.offsetY}px))`,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.25)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ padding: "12px 16px 16px", background: colors.bgCard }}>
        <label style={{ display: "block", fontFamily: F, fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>
          {ko ? "크기 조절" : "Zoom"}
        </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={transform.scale}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: colors.accent }}
        />
        <p style={{ fontFamily: F, fontSize: 10, color: colors.textLight, margin: "8px 0 14px", lineHeight: 1.5 }}>
          {ko ? "사진을 드래그해 위치를 맞추고, 슬라이더로 확대·축소하세요." : "Drag to reposition and use the slider to zoom."}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: "10px", border: `1px solid ${colors.border}`, background: "transparent", fontFamily: F, fontSize: 11, cursor: "pointer", color: colors.textSecondary }}
          >
            {ko ? "다시 선택" : "Choose again"}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={applying}
            style={{ flex: 1, padding: "10px", border: "none", background: applying ? colors.border : colors.accent, fontFamily: F, fontSize: 11, fontWeight: 600, cursor: applying ? "wait" : "pointer", color: colors.bgPrimary }}
          >
            {applying ? (ko ? "처리 중…" : "Applying…") : ko ? "적용" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
