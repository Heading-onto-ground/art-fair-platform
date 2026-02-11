"use client";

import { F, S, colors } from "@/lib/design";

type SectionProps = {
  number?: string;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export default function Section({ number, title, children, style }: SectionProps) {
  return (
    <section style={{ marginBottom: 48, ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
        {number && (
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: colors.accent,
            }}
          >
            {number}
          </span>
        )}
        <h2
          style={{
            fontFamily: S,
            fontSize: 24,
            fontWeight: 400,
            color: colors.textPrimary,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
