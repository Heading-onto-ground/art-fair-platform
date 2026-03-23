/**
 * ROB Artist Ritual — Design tokens
 * Minimal, calm, artist-focused aesthetic
 */

export const colors = {
  bgPrimary: "#FDFBF7",
  bgSecondary: "#F5F1EB",
  bgDark: "#1A1A1A",
  bgCard: "#FFFFFF",
  bgCardHover: "#FAF8F4",

  textPrimary: "#1A1A1A",
  textSecondary: "#4A4A4A",
  textMuted: "#8A8580",
  textLight: "#B0AAA2",
  textOnDark: "#FDFBF7",

  border: "#E8E3DB",
  borderLight: "#F0EBE3",

  accent: "#8B7355",
  accentHover: "#6B5A45",
  accentSoft: "rgba(139, 115, 85, 0.12)",

  success: "#5A7A5A",
  error: "#8B4A4A",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 2,
  md: 4,
  lg: 8,
} as const;

export const typography = {
  overline: {
    fontSize: 9,
    fontWeight: "500" as const,
    letterSpacing: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "500" as const,
    letterSpacing: 1.2,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 1.6,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "300" as const,
    letterSpacing: 0.5,
  },
  titleLarge: {
    fontSize: 28,
    fontWeight: "300" as const,
    letterSpacing: 0.3,
  },
  display: {
    fontSize: 36,
    fontWeight: "300" as const,
    letterSpacing: 1,
  },
} as const;
