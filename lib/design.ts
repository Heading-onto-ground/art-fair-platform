// ──────────────────────────────────────────
// Shared Design Tokens
// Central source of truth for fonts, colors, spacing
// ──────────────────────────────────────────

// Font families — uses CSS variables set by next/font in layout.tsx
// Fallback font names included for compatibility
export const FONT_BODY = "var(--font-inter), 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
export const FONT_DISPLAY = "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif";

// Shorthand aliases (for backward compat with existing F/S pattern)
export const F = FONT_BODY;
export const S = FONT_DISPLAY;

// ──────────────────────────────────────────
// Colors — mirroring CSS variables from globals.css
// Use these in inline styles; CSS variables are preferred in stylesheets
// ──────────────────────────────────────────
export const colors = {
  bgPrimary: "#FDFBF7",
  bgSecondary: "#F5F1EB",
  bgCard: "#FFFFFF",
  bgCardHover: "#FAF8F4",
  bgAccent: "#F0EBE3",

  textPrimary: "#1A1A1A",
  textSecondary: "#4A4A4A",
  textMuted: "#8A8580",
  textLight: "#B0AAA2",

  border: "#E8E3DB",
  borderLight: "#F0EBE3",
  borderDark: "#D4CEC4",

  accent: "#8B7355",
  accentHover: "#6B5A45",
  accentSoft: "rgba(139, 115, 85, 0.08)",

  success: "#5A7A5A",
  error: "#8B4A4A",
  warning: "#9A8A5A",
  white: "#FFFFFF",
} as const;

// ──────────────────────────────────────────
// Common inline style patterns
// ──────────────────────────────────────────
export const labelStyle = {
  fontFamily: FONT_BODY,
  fontSize: 10,
  fontWeight: 500 as const,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: colors.accent,
} as const;

export const sectionTitleStyle = {
  fontFamily: FONT_DISPLAY,
  fontSize: 28,
  fontWeight: 400 as const,
  color: colors.textPrimary,
  margin: 0,
  lineHeight: 1.3,
} as const;

export const mutedTextStyle = {
  fontFamily: FONT_BODY,
  fontSize: 13,
  color: colors.textMuted,
  lineHeight: 1.6,
} as const;

export const cardStyle = {
  background: colors.bgCard,
  border: `1px solid ${colors.border}`,
  padding: 32,
} as const;

export const buttonPrimaryStyle = {
  padding: "12px 28px",
  border: `1px solid ${colors.textPrimary}`,
  background: colors.textPrimary,
  color: colors.bgPrimary,
  fontFamily: FONT_BODY,
  fontSize: 10,
  fontWeight: 500 as const,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  cursor: "pointer" as const,
  transition: "all 0.3s ease",
} as const;

export const buttonSecondaryStyle = {
  padding: "12px 28px",
  border: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textSecondary,
  fontFamily: FONT_BODY,
  fontSize: 10,
  fontWeight: 500 as const,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  cursor: "pointer" as const,
  transition: "all 0.3s ease",
} as const;
