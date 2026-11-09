/**
 * Civic Pulse - Modul LBS
 * Component: SelectedReportCard
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Responsiveness & Usability:
 * - Menggunakan Safe Area Insets dinamis agar tidak tertutup navigation bar Android / iOS.
 * - Penanda tegas "DATA SIMULASI" untuk menjaga integritas data pengujian (SDG 11).
 * - Menampilkan jarak garis lurus Haversine yang telah dihitung oleh layer kalkulasi.
 * - Aksi fokus peta opsional untuk mempermudah inspeksi titik kerusakan infrastruktur.
 * - Desain card modern, kontras tinggi, dan aksesibilitas lengkap (WCAG AA).
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SelectedReportCardProps } from "../../types/components";
import { CivicReportCategory, CivicReportSeverity } from "../../types/report";

const CATEGORY_META: Record<
  CivicReportCategory,
  { label: string; icon: string; bg: string; text: string }
> = {
  "road-damage": {
    label: "Kerusakan Jalan",
    icon: "🚧",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  flood: {
    label: "Banjir / Genangan",
    icon: "🌊",
    bg: "#DBEAFE",
    text: "#1E40AF",
  },
  landslide: {
    label: "Tanah Longsor",
    icon: "⚠️",
    bg: "#FEE2E2",
    text: "#991B1B",
  },
  "street-light": {
    label: "Lampu Jalan Padam",
    icon: "💡",
    bg: "#FEF9C3",
    text: "#854D0E",
  },
};

const SEVERITY_CONFIG: Record<
  CivicReportSeverity,
  { label: string; color: string; bg: string }
> = {
  high: { label: "Kritis / Tinggi", color: "#DC2626", bg: "#FEF2F2" },
  medium: { label: "Tingkat Sedang", color: "#D97706", bg: "#FFFBEB" },
  low: { label: "Tingkat Rendah", color: "#059669", bg: "#ECFDF5" },
};

export const SelectedReportCard = memo(function SelectedReportCard({
  report,
  userLocation,
  distanceFormatted,
  onClose,
  onFocusReport,
  insets,
}: SelectedReportCardProps) {
  const categoryMeta = CATEGORY_META[report.category] || {
    label: report.category,
    icon: "📍",
    bg: "#F1F5F9",
    text: "#334155",
  };
  const severityMeta = SEVERITY_CONFIG[report.severity] || {
    label: report.severity,
    color: "#475569",
    bg: "#F1F5F9",
  };

  const bottomPosition = (insets?.bottom ?? 0) > 0 ? insets!.bottom + 12 : 20;

  return (
    <View
      style={[styles.cardContainer, { bottom: bottomPosition }]}
      accessibilityRole="summary"
      accessibilityLabel={`Rincian Laporan: ${report.title}. Kategori ${categoryMeta.label}, Jarak: ${distanceFormatted}`}
    >
      {/* Top Header: Simulation Flag & Close Button */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.simulationBadge}>
            <Text style={styles.simulationBadgeText}>DATA SIMULASI</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: categoryMeta.bg }]}>
            <Text style={styles.categoryIcon}>{categoryMeta.icon}</Text>
            <Text style={[styles.categoryLabel, { color: categoryMeta.text }]}>
              {categoryMeta.label}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Tutup rincian laporan"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {report.title}
      </Text>

      {/* Meta Metrics: Severity & Haversine Distance */}
      <View style={styles.metaRow}>
        <View
          style={[styles.severityBadge, { backgroundColor: severityMeta.bg, borderColor: severityMeta.color + "40" }]}
        >
          <View style={[styles.severityDot, { backgroundColor: severityMeta.color }]} />
          <Text style={[styles.severityText, { color: severityMeta.color }]}>
            {severityMeta.label}
          </Text>
        </View>

        <View style={styles.distanceBadge}>
          <Text style={styles.distanceIcon}>📏</Text>
          <Text style={styles.distanceLabel}>Jarak Lurus:</Text>
          <Text
            style={[
              styles.distanceValue,
              !userLocation && styles.distanceValueWaiting,
            ]}
          >
            {distanceFormatted}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>
        {report.description}
      </Text>

      {/* Action Footer: Focus on Point */}
      {onFocusReport && (
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.focusButton}
            onPress={() => onFocusReport(report)}
            accessibilityRole="button"
            accessibilityLabel={`Pusatkan peta ke lokasi ${report.title}`}
          >
            <Text style={styles.focusButtonText}>📍 Pusatkan ke Lokasi Laporan</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  simulationBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simulationBadgeText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 11,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "bold",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  severityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  distanceIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  distanceLabel: {
    fontSize: 11,
    color: "#64748B",
    marginRight: 6,
  },
  distanceValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  distanceValueWaiting: {
    color: "#94A3B8",
    fontStyle: "italic",
    fontWeight: "500",
  },
  description: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
  footerRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  focusButton: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  focusButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
});
