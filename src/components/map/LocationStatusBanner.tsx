/**
 * Civic Pulse - Modul LBS
 * Component: LocationStatusBanner
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Visual & Accessibility:
 * - Menangani semua state LBS: idle, requesting-permission, permission-denied, loading, tracking, error.
 * - Tetap memfasilitasi penggunaan peta saat permission ditolak (graceful degradation).
 * - Warna dan kontras rasio sesuai standar aksesibilitas WCAG AAA (> 7:1).
 * - Tombol coba lagi dengan touch target yang ramah jari pengguna.
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LocationStatusBannerProps } from "../../types/components";

export const LocationStatusBanner = memo(function LocationStatusBanner({
  status,
  error,
  permissionGranted,
  onRetry,
}: LocationStatusBannerProps) {
  // Ketika pelacakan aktif normal, sembunyikan banner agar peta bersih & fokus
  if (status === "tracking") {
    return null;
  }

  let bannerStyle = styles.infoBanner;
  let textStyle = styles.infoText;
  let message = "";
  let icon = "ℹ️";
  let showRetry = false;

  switch (status) {
    case "requesting-permission":
      message = "Meminta izin akses lokasi foreground perangkat...";
      icon = "🔒";
      break;
    case "loading":
      message = "Menghubungkan ke sensor GPS & mencari sinyal posisi...";
      icon = "📡";
      break;
    case "permission-denied":
      bannerStyle = styles.warningBanner;
      textStyle = styles.warningText;
      message =
        error ||
        "Izin lokasi ditolak. Peta tetap dapat digunakan untuk meninjau titik laporan simulasi.";
      icon = "⚠️";
      showRetry = true;
      break;
    case "error":
      bannerStyle = styles.errorBanner;
      textStyle = styles.errorText;
      message = error || "Gagal memperoleh sinyal GPS dari perangkat Anda.";
      icon = "❌";
      showRetry = true;
      break;
    case "idle":
    default:
      return null;
  }

  return (
    <View
      style={[styles.bannerContainer, bannerStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.contentRow}>
        <Text style={styles.statusIcon}>{icon}</Text>
        <Text style={[styles.text, textStyle]}>{message}</Text>
      </View>

      {showRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Coba lagi mengaktifkan lokasi"
          accessibilityHint="Meminta ulang izin atau memperbarui koordinat GPS perangkat"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  infoBanner: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  warningBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  infoText: {
    color: "#1E40AF",
  },
  warningText: {
    color: "#92400E",
  },
  errorText: {
    color: "#991B1B",
  },
  retryButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  retryText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1E293B",
  },
});
