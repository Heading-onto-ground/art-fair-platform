"use client";

import { colors } from "@/lib/design";

type CardProps = {
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
  accent?: boolean;
  style?: React.CSSProperties;
};

export default function Card({ children, onClick, hover = false, accent = false, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.bgCard,
        border: `1px solid ${accent ? colors.accent : colors.border}`,
        padding: 32,
        cursor: onClick ? "pointer" : undefined,
        transition: hover ? "all 0.3s ease" : undefined,
        ...style,
      }}
      onMouseEnter={
        hover
          ? (e) => {
              e.currentTarget.style.background = colors.bgCardHover;
              e.currentTarget.style.borderColor = accent ? colors.accent : colors.borderDark;
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              e.currentTarget.style.background = colors.bgCard;
              e.currentTarget.style.borderColor = accent ? colors.accent : colors.border;
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
