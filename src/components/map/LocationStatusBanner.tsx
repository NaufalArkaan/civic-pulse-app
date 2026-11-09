/**
 * Civic Pulse - Modul LBS
 * Component: LocationStatusBanner
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
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
  // Jika tracking aktif tanpa kendala, banner disembunyikan agar visual peta bersih
  if (status === "tracking") {
    return null;
  }

  let bannerStyle = styles.infoBanner;
  let textStyle = styles.infoText;
  let message = "";
  let showRetry = false;

  switch (status) {
    case "requesting-permission":
      message = "Meminta izin akses lokasi foreground...";
      break;
    case "loading":
      message = "Menghubungkan ke sensor GPS & mencari sinyal satelit...";
      break;
    case "permission-denied":
      bannerStyle = styles.warningBanner;
      textStyle = styles.warningText;
      message =
        error ||
        "Izin lokasi ditolak. Peta tetap dapat digunakan dalam mode inspeksi laporan simulasi.";
      showRetry = true;
      break;
    case "error":
      bannerStyle = styles.errorBanner;
      textStyle = styles.errorText;
      message = error || "Gagal memperoleh sinyal GPS perangkat.";
      showRetry = true;
      break;
    case "idle":
    default:
      return null;
  }

  return (
    <View style={[styles.container, bannerStyle]}>
      <Text style={[styles.text, textStyle]}>{message}</Text>
      {showRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  retryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
});

