"use client";

import { F, colors } from "@/lib/design";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning";
};

const variantColors = {
  default: { color: colors.textMuted, border: colors.border },
  accent: { color: colors.accent, border: colors.accent },
  success: { color: colors.success, border: colors.success },
  warning: { color: colors.warning, border: colors.warning },
};

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const v = variantColors[variant];
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: F,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: v.color,
        padding: "4px 10px",
        border: `1px solid ${v.border}`,
      }}
    >
      {children}
    </span>
  );
}
