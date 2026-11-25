/**
 * Civic Pulse - Pertemuan 12
 * Component: SkeletonLoader
 * Role: Anggota 2 (Lead Frontend) & Anggota 1 (Lead System Architect)
 *
 * Performance & Animation Safeguards:
 * - Menggunakan Reanimated `useSharedValue` dan loop `withRepeat(withTiming)` di native thread.
 * - Opacity pulsing ringan (0.4 - 0.9) tanpa overhead komputasi berlebihan.
 * - Accessible: Menandai `accessibilityElementsHidden={true}` agar screen reader tidak membacanya sebagai konten teks acak.
 */

import React, { useEffect } from "react";
import { StyleSheet, DimensionValue, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  ReduceMotion,
} from "react-native-reanimated";
import { THEME } from "../../constants/theme";

export type SkeletonLoaderProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonLoader({
  width = "100%",
  height = 16,
  borderRadius = THEME.radius.md,
  style,
}: SkeletonLoaderProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, {
        duration: 850,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: THEME.colors.skeletonBase,
  },
});
