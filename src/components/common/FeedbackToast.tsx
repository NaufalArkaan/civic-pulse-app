/**
 * Civic Pulse - Pertemuan 12
 * Component: FeedbackToast
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Micro-Interaction & Notification Safeguards:
 * - Slide-in and fade-in animation using Reanimated `withSpring` & `withTiming`.
 * - Auto-dismiss after 2500ms with callback.
 * - Accessible: `accessibilityLiveRegion="polite"` and `accessibilityRole="alert"`.
 * - Floating banner with distinct visual feedback (success/error/info) without blocking navigation.
 */

import React, { memo, useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  ReduceMotion,
} from "react-native-reanimated";
import { THEME } from "../../constants/theme";

export type FeedbackToastProps = {
  message: string | null;
  type?: "success" | "error" | "info";
  onDismiss?: () => void;
  durationMs?: number;
};

export const FeedbackToast = memo(function FeedbackToast({
  message,
  type = "success",
  onDismiss,
  durationMs = 2500,
}: FeedbackToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    if (message) {
      opacity.value = withTiming(1, { duration: 200, reduceMotion: ReduceMotion.System });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 200,
        reduceMotion: ReduceMotion.System,
      });

      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 250, reduceMotion: ReduceMotion.System });
        translateY.value = withTiming(-20, { duration: 250, reduceMotion: ReduceMotion.System });
        dismissTimer = setTimeout(() => {
          onDismiss?.();
        }, 260);
      }, durationMs);

      return () => {
        clearTimeout(timer);
        if (dismissTimer) {
          clearTimeout(dismissTimer);
        }
      };
    } else {
      opacity.value = 0;
      translateY.value = -20;
    }
  }, [message, durationMs, onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;

  const isSuccess = type === "success";
  const isError = type === "error";

  const icon = isSuccess ? "✅" : isError ? "⚠️" : "ℹ️";
  const bg = isSuccess ? THEME.colors.successBg : isError ? THEME.colors.dangerBg : THEME.colors.infoBg;
  const textColor = isSuccess ? THEME.colors.success : isError ? THEME.colors.danger : THEME.colors.info;
  const borderColor = isSuccess ? "#A7F3D0" : isError ? "#FECACA" : "#BFDBFE";

  return (
    <Animated.View
      style={[styles.toastContainer, { backgroundColor: bg, borderColor }, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Pemberitahuan: ${message}`}
    >
      <Text style={styles.toastIcon}>{icon}</Text>
      <Text style={[styles.toastText, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  toastContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toastIcon: {
    fontSize: 16,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
});
