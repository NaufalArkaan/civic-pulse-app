/**
 * Civic Pulse - Pertemuan 12
 * Component: AnimatedPressable
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Micro-Interaction & Ergonomics Safeguards:
 * - Menggunakan Reanimated `useSharedValue` dan `withSpring` di native thread.
 * - Memberikan umpan balik taktil mikro (scale 0.96) saat ditekan dan kembali ke 1.0 saat dilepas.
 * - Menghormati preferensi aksesibilitas pengguna sistem `ReduceMotion.System`.
 * - Standar ukuran area sentuh minimum WCAG AA (>= 44 dp).
 */

import React, { memo, useCallback } from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ReduceMotion,
} from "react-native-reanimated";

export type AnimatedPressableProps = PressableProps & {
  activeScale?: number;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable = memo(function AnimatedPressable({
  activeScale = 0.96,
  style,
  containerStyle,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withSpring(activeScale, {
          damping: 15,
          stiffness: 250,
          reduceMotion: ReduceMotion.System,
        });
      }
      onPressIn?.(e);
    },
    [activeScale, disabled, onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 250,
          reduceMotion: ReduceMotion.System,
        });
      }
      onPressOut?.(e);
    },
    [disabled, onPressOut, scale]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, containerStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
});
