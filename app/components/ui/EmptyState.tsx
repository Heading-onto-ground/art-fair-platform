"use client";

import { F, colors } from "@/lib/design";

type EmptyStateProps = {
  message: string;
  icon?: string;
};

export default function EmptyState({ message, icon = "—" }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        color: colors.textLight,
        fontFamily: F,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      {message}
    </div>
  );
}
