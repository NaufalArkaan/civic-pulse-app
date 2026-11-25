/**
 * Civic Pulse - Pertemuan 12
 * Hook: useResponsiveLayout
 * Role: Anggota 1 (Lead System Architect)
 *
 * Responsiveness Safeguards:
 * - Menangkap perubahan dimensi secara reaktif menggunakan `useWindowDimensions()`.
 * - Mendukung rotasi layar (portrait <-> landscape) tanpa memerlukan restart aplikasi.
 * - Menghitung batasan lebar konten (maxContentWidth) untuk mencegah peregangan berlebih pada tablet/layar lebar.
 */

import { useMemo } from "react";
import { useWindowDimensions, StyleProp, ViewStyle } from "react-native";
import {
  isLandscapeOrientation,
  getDeviceTier,
  getResponsivePadding,
  LAYOUT_CONSTRAINTS,
} from "../constants/breakpoints";

export type ResponsiveLayoutInfo = {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  tier: "compact" | "medium" | "tablet" | "expanded";
  horizontalPadding: number;
  contentMaxWidth: number;
  centeredContainerStyle: StyleProp<ViewStyle>;
};

export function useResponsiveLayout(): ResponsiveLayoutInfo {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = isLandscapeOrientation(width, height);
    const tier = getDeviceTier(width);
    const isTablet = tier === "tablet" || tier === "expanded";
    const horizontalPadding = getResponsivePadding(width);
    const contentMaxWidth = isTablet || isLandscape ? LAYOUT_CONSTRAINTS.maxContentWidth : width;

    const centeredContainerStyle: ViewStyle = {
      width: "100%",
      maxWidth: contentMaxWidth,
      alignSelf: "center",
    };

    return {
      width,
      height,
      isLandscape,
      isTablet,
      tier,
      horizontalPadding,
      contentMaxWidth,
      centeredContainerStyle,
    };
  }, [width, height]);
}
