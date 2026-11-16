/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultHeader
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Header Bar & Metadata Metrics Summary:
 * - Menampilkan navigasi kembali ke peta interaktif Pertemuan 9.
 * - Menyajikan ringkasan kuantitatif dokumen tersimpan (total berkas & total ukuran di sandbox).
 * - Desain profesional dark-mode header yang konsisten dengan tema Civic Pulse.
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VaultHeaderProps } from "../../types/components";

export const VaultHeader = memo(function VaultHeader({
  onBack,
  onRefresh,
  isRefreshing,
  totalFiles = 0,
  totalSizeBytes = 0,
}: VaultHeaderProps) {
  const formattedTotalSize =
    totalSizeBytes < 1024 * 1024
      ? `${(totalSizeBytes / 1024).toFixed(1)} KB`
      : `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <View style={styles.header}>
      {/* Top Navigation Row */}
      <View style={styles.topRow}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke peta insiden"
            accessibilityHint="Mengarahkan kembali ke layar peta interaktif Pertemuan 9"
          >
            <Text style={styles.backButtonText}>← Peta</Text>
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Document Vault</Text>
          <Text style={styles.subtitle}>Scoped Storage & Keystore (SDG 11)</Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            style={[styles.refreshButton, isRefreshing && styles.refreshing]}
            onPress={onRefresh}
            disabled={isRefreshing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Segarkan daftar dokumen"
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Metrics Summary Strip */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{totalFiles}</Text>
          <Text style={styles.metricLabel}>Total Berkas</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{formattedTotalSize}</Text>
          <Text style={styles.metricLabel}>Ukuran Sandbox</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <View style={styles.offlinePill}>
            <Text style={styles.offlinePillText}>Offline Ready</Text>
          </View>
          <Text style={styles.metricLabel}>Penyimpanan</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    backgroundColor: "#334155",
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "700",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshing: {
    opacity: 0.5,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  metricsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#334155",
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  metricLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#334155",
  },
  offlinePill: {
    backgroundColor: "#065F46",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offlinePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A7F3D0",
  },
});
