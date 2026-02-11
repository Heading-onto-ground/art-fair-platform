"use client";

import { F, S } from "@/lib/design";

/** Generate a deterministic hue from a string */
function strToHue(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/** Palette presets — earthy, gallery-like tones */
const PALETTES = [
  { bg: "#2C2C2C", accent: "#C4A265", text: "#F5F0E8" },
  { bg: "#1A2536", accent: "#8BAFC4", text: "#EDF2F6" },
  { bg: "#3A2520", accent: "#D4956A", text: "#F8F0EA" },
  { bg: "#1E3028", accent: "#7CB08A", text: "#EEF5F0" },
  { bg: "#332B3D", accent: "#B08DC4", text: "#F2EDF6" },
  { bg: "#3D2E1E", accent: "#CDB380", text: "#FAF6EE" },
  { bg: "#1E2D3D", accent: "#6A9FC4", text: "#ECF2F8" },
  { bg: "#3D1E2E", accent: "#C47A8A", text: "#F8ECF0" },
  { bg: "#2A3320", accent: "#98B060", text: "#F2F5EC" },
  { bg: "#33281E", accent: "#C4A06A", text: "#FAF4EA" },
];

type Props = {
  posterImage?: string | null;
  gallery: string;
  theme: string;
  city: string;
  country: string;
  deadline?: string;
  width?: number | string;
  height?: number | string;
  /** If true, uses aspect-ratio instead of fixed height (for responsive hero banners) */
  hero?: boolean;
  className?: string;
};

export default function OpenCallPoster({
  posterImage,
  gallery,
  theme,
  city,
  country,
  deadline,
  width = 100,
  height = 140,
  hero = false,
  className,
}: Props) {
  // If real poster, just show it
  if (posterImage) {
    return (
      <div className={className} style={{
        width: hero ? "100%" : width,
        height: hero ? undefined : height,
        aspectRatio: hero ? "16 / 6" : undefined,
        flexShrink: 0, overflow: "hidden", border: hero ? "none" : "1px solid #EEEAE5",
      }}>
        <img src={posterImage} alt={gallery} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  // Generate a unique visual placeholder
  const hue = strToHue(gallery + city);
  const palette = PALETTES[hue % PALETTES.length];
  const initials = gallery
    .split(/[\s&·\-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={className}
      style={{
        width: hero ? "100%" : width,
        height: hero ? undefined : height,
        aspectRatio: hero ? "16 / 6" : undefined,
        flexShrink: 0,
        overflow: "hidden",
        background: palette.bg,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: hero ? "24px 32px" : "12px 14px",
      }}
    >
      {/* Decorative corner accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "40%",
          height: "40%",
          background: palette.accent,
          opacity: 0.12,
          clipPath: "polygon(100% 0, 0 0, 100% 100%)",
        }}
      />
      {/* Thin accent line */}
      <div style={{ width: hero ? 40 : 24, height: 2, background: palette.accent, marginBottom: hero ? 10 : 6, opacity: 0.8 }} />

      {/* Gallery name */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: hero ? 6 : 3, position: "relative", zIndex: 1 }}>
        <span
          style={{
            fontFamily: S,
            fontSize: hero ? 28 : 13,
            fontWeight: 400,
            color: palette.text,
            lineHeight: 1.2,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as any,
          }}
        >
          {gallery}
        </span>
        {hero && theme && (
          <span
            style={{
              fontFamily: F,
              fontSize: 13,
              fontWeight: 300,
              color: palette.text,
              opacity: 0.7,
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical" as any,
            }}
          >
            {theme}
          </span>
        )}
        <span
          style={{
            fontFamily: F,
            fontSize: hero ? 11 : 8,
            fontWeight: 400,
            color: palette.accent,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          {country} / {city}
        </span>
      </div>

      {/* Bottom: OPEN CALL tag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 1 }}>
        <span
          style={{
            fontFamily: F,
            fontSize: hero ? 10 : 7,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: palette.accent,
            opacity: 0.9,
          }}
        >
          OPEN CALL
        </span>
        {deadline && (
          <span
            style={{
              fontFamily: F,
              fontSize: hero ? 10 : 7,
              fontWeight: 400,
              color: palette.text,
              opacity: 0.5,
            }}
          >
            ~{deadline}
          </span>
        )}
      </div>
    </div>
  );
}
