"use client";

import { F, S, colors } from "@/lib/design";

type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "32px 24px" : "56px 40px",
        textAlign: "center",
        border: `1px dashed ${colors.borderDark}`,
        background: colors.bgPrimary,
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: compact ? 28 : 36,
            marginBottom: compact ? 12 : 16,
            opacity: 0.4,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontFamily: S,
          fontSize: compact ? 18 : 22,
          fontWeight: 400,
          color: colors.textPrimary,
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontFamily: F,
            fontSize: 12,
            color: colors.textLight,
            lineHeight: 1.6,
            maxWidth: 360,
            margin: "0 0 24px",
          }}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: description ? 0 : 20 }}>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                padding: "12px 28px",
                border: "none",
                background: colors.textPrimary,
                color: "#FDFBF7",
                fontFamily: F,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#3A3A3A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colors.textPrimary; }}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                padding: "12px 28px",
                border: `1px solid ${colors.border}`,
                background: "transparent",
                color: colors.textSecondary,
                fontFamily: F,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.textPrimary; e.currentTarget.style.color = colors.textPrimary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textSecondary; }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
