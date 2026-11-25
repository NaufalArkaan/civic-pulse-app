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
  isCompact: boolean;
  isMedium: boolean;
  tier: "compact" | "medium" | "tablet" | "expanded";
  horizontalPadding: number;
  contentMaxWidth: number;
  maxModalWidth: number;
  maxCardWidth: number;
  centeredContainerStyle: StyleProp<ViewStyle>;
  modalContainerStyle: StyleProp<ViewStyle>;
  cardContainerStyle: StyleProp<ViewStyle>;
};

export function useResponsiveLayout(): ResponsiveLayoutInfo {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = isLandscapeOrientation(width, height);
    const tier = getDeviceTier(width);
    const isTablet = tier === "tablet" || tier === "expanded";
    const isCompact = tier === "compact";
    const isMedium = tier === "medium";
    const horizontalPadding = getResponsivePadding(width);
    const contentMaxWidth = isTablet || isLandscape ? LAYOUT_CONSTRAINTS.maxContentWidth : width;

    const centeredContainerStyle: ViewStyle = {
      width: "100%",
      maxWidth: contentMaxWidth,
      alignSelf: "center",
    };

    const modalContainerStyle: ViewStyle = {
      width: "100%",
      maxWidth: Math.min(width - 32, LAYOUT_CONSTRAINTS.maxModalWidth),
      alignSelf: "center",
    };

    const cardContainerStyle: ViewStyle = {
      width: "100%",
      maxWidth: Math.min(width - 32, LAYOUT_CONSTRAINTS.maxCardWidth),
      alignSelf: "center",
    };

    return {
      width,
      height,
      isLandscape,
      isTablet,
      isCompact,
      isMedium,
      tier,
      horizontalPadding,
      contentMaxWidth,
      maxModalWidth: LAYOUT_CONSTRAINTS.maxModalWidth,
      maxCardWidth: LAYOUT_CONSTRAINTS.maxCardWidth,
      centeredContainerStyle,
      modalContainerStyle,
      cardContainerStyle,
    };
  }, [width, height]);
}
