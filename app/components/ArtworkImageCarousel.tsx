"use client";

import { useRef, useState } from "react";
import { F } from "@/lib/design";

type Props = {
  images: string[];
  alt?: string;
  objectFit?: "cover" | "contain";
};

/** Instagram-style swipeable image carousel (scroll-snap + dots + arrows). */
export default function ArtworkImageCarousel({ images, alt = "", objectFit = "cover" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div style={{ aspectRatio: "1", background: "#111" }}>
        <img src={images[0]} alt={alt} style={{ width: "100%", height: "100%", objectFit, display: "block" }} />
      </div>
    );
  }

  function onScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.min(images.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }

  function scrollTo(idx: number) {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(images.length - 1, idx));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="carousel-scroll"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          aspectRatio: "1",
          background: "#111",
          scrollbarWidth: "none",
        }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={i === 0 ? alt : ""}
            style={{
              flex: "0 0 100%",
              width: "100%",
              height: "100%",
              objectFit,
              scrollSnapAlign: "start",
              display: "block",
            }}
          />
        ))}
      </div>

      <span
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "3px 8px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontFamily: F,
          fontSize: 10,
          zIndex: 1,
        }}
      >
        {active + 1}/{images.length}
      </span>

      {active > 0 && (
        <button type="button" aria-label="Previous image" onClick={() => scrollTo(active - 1)} style={{ ...arrowStyle, left: 8 }}>
          ‹
        </button>
      )}
      {active < images.length - 1 && (
        <button type="button" aria-label="Next image" onClick={() => scrollTo(active + 1)} style={{ ...arrowStyle, right: 8 }}>
          ›
        </button>
      )}

      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 1 }}>
        {images.map((_, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === active ? "#fff" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
