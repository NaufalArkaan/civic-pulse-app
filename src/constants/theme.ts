/**
 * Civic Pulse - Pertemuan 12
 * Design Tokens & Visual Theme (SDG 11)
 * Role: Anggota 1 (Lead System Architect) & Anggota 2 (Lead Frontend)
 */

export const THEME = {
  colors: {
    primary: "#208AEF",
    primaryDark: "#0369A1",
    primaryLight: "#E0F2FE",
    
    backgroundDark: "#0F172A",
    surfaceDark: "#1E293B",
    surfaceBorderDark: "#334155",
    
    backgroundLight: "#F8FAFC",
    surfaceLight: "#FFFFFF",
    surfaceBorderLight: "#E2E8F0",
    
    textDark: "#0F172A",
    textMutedDark: "#64748B",
    textLight: "#F8FAFC",
    textMutedLight: "#94A3B8",
    
    danger: "#DC2626",
    dangerBg: "#FEF2F2",
    warning: "#D97706",
    warningBg: "#FFFBEB",
    success: "#059669",
    successBg: "#F0FDF4",
    info: "#2563EB",
    infoBg: "#EFF6FF",

    // Skeleton shimmer base & highlight
    skeletonBase: "#E2E8F0",
    skeletonHighlight: "#F1F5F9",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  },
  typography: {
    title: {
      fontSize: 20,
      fontWeight: "700" as const,
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: "500" as const,
      lineHeight: 20,
    },
    body: {
      fontSize: 14,
      fontWeight: "400" as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: "400" as const,
      lineHeight: 16,
    },
    badge: {
      fontSize: 11,
      fontWeight: "700" as const,
      lineHeight: 14,
    },
  },
} as const;
