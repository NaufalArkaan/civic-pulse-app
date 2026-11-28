/**
 * Civic Pulse - Pertemuan 13 Redesign
 * Component: FloatingNavBar (Modern Minimalist Pill Navigation)
 *
 * Mengadaptasi konsep floating pill bottom navigation dari desain referensi:
 * - Kontainer kapsul gelap (Dark Slate/Charcoal) melayang di bagian bawah layar.
 * - Tab aktif berbentuk pill putih dengan ikon dan teks label.
 * - Tab non-aktif berupa ikon minimalis dengan touch target ergonomis (>= 44dp).
 * - Tidak merusak atau menghapus route yang sudah ada (/ , /reports , /vault).
 */

import React, { memo } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ReduceMotion,
} from "react-native-reanimated";

export type NavTabId = "map" | "reports" | "vault";

interface NavItem {
  id: NavTabId;
  label: string;
  route: string;
  icon: string;
  activeIcon: string;
  a11yLabel: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "map",
    label: "Peta",
    route: "/",
    icon: "🗺️",
    activeIcon: "🗺️",
    a11yLabel: "Buka Peta Interaktif Mitigasi Bencana",
  },
  {
    id: "reports",
    label: "Laporan",
    route: "/reports",
    icon: "📋",
    activeIcon: "📋",
    a11yLabel: "Buka Feed Real-Time Laporan Warga",
  },
  {
    id: "vault",
    label: "Vault",
    route: "/vault",
    icon: "🔐",
    activeIcon: "🔐",
    a11yLabel: "Buka Document Vault dan Secure Storage",
  },
];

interface FloatingNavBarProps {
  currentTab?: NavTabId;
  onPressAction?: () => void;
  actionLabel?: string;
  actionIcon?: string;
}

export const FloatingNavBar = memo(function FloatingNavBar({
  currentTab,
  onPressAction,
  actionLabel = "+ Lapor",
  actionIcon = "⚡",
}: FloatingNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const getActiveTab = (): NavTabId => {
    if (currentTab) return currentTab;
    if (pathname === "/reports") return "reports";
    if (pathname === "/vault") return "vault";
    return "map";
  };

  const activeTab = getActiveTab();

  const handleNavigate = (item: NavItem) => {
    if (item.route === pathname) return;

    if (item.route === "/") {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } else {
      router.push(item.route as any);
    }
  };

  // Posisi floating di atas safe area bawah
  const bottomOffset = Math.max(insets.bottom, 12) + 8;

  return (
    <View style={[styles.floatingContainer, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.pillCapsule}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;

          if (isActive) {
            return (
              <View key={item.id} style={styles.activePill}>
                <Text style={styles.activeIcon}>{item.activeIcon}</Text>
                <Text style={styles.activeLabel}>{item.label}</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.inactiveTab}
              onPress={() => handleNavigate(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              accessibilityLabel={item.a11yLabel}
            >
              <Text style={styles.inactiveIcon}>{item.icon}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Action Button Cepat: Tambah Laporan Baru (jika disediakan) */}
        {onPressAction && (
          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={onPressAction}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Buat Laporan Baru Cepat"
          >
            <Text style={styles.actionPillIcon}>{actionIcon}</Text>
            <Text style={styles.actionPillText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  pillCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A", // Dark Slate/Charcoal elegan
    borderRadius: 36,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activeIcon: {
    fontSize: 16,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  inactiveTab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveIcon: {
    fontSize: 18,
    opacity: 0.85,
  },
  actionPillButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB", // Primary Civic Pulse Blue
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 13,
    marginLeft: 4,
    gap: 5,
  },
  actionPillIcon: {
    fontSize: 13,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },
});
