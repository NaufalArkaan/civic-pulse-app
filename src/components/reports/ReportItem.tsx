/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportItem
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Report, ReportStatus, CivicReportCategory } from "../../types/report";

type ReportItemProps = {
  report: Report;
  onUpdateStatus?: (id: string, newStatus: ReportStatus) => void;
};

const CATEGORY_ICONS: Record<CivicReportCategory, string> = {
  "road-damage": "🚧",
  flood: "🌊",
  landslide: "⚠️",
  "street-light": "💡",
};

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: "Diajukan", color: "#D97706", bg: "#FEF3C7" },
  verified: { label: "Terverifikasi", color: "#2563EB", bg: "#DBEAFE" },
  in_progress: { label: "Diproses", color: "#7C3AED", bg: "#EDE9FE" },
  resolved: { label: "Selesai", color: "#059669", bg: "#D1FAE5" },
  rejected: { label: "Ditolak", color: "#DC2626", bg: "#FEE2E2" },
};

export const ReportItem = memo(function ReportItem({
  report,
  onUpdateStatus,
}: ReportItemProps) {
  const icon = CATEGORY_ICONS[report.category] || "📍";
  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.submitted;

  const formattedDate = new Date(report.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryIcon}>{icon}</Text>
          <Text style={styles.categoryName}>
            {report.category === "road-damage"
              ? "Jalan"
              : report.category === "flood"
              ? "Banjir"
              : report.category === "landslide"
              ? "Longsor"
              : "Lampu PJU"}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {report.title}
      </Text>

      <Text style={styles.description} numberOfLines={3}>
        {report.description}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.timestamp}>📅 {formattedDate}</Text>

        {onUpdateStatus && report.status === "submitted" && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onUpdateStatus(report.id, "verified")}
          >
            <Text style={styles.actionButtonText}>Verifikasi</Text>
          </TouchableOpacity>
        )}

        {onUpdateStatus && report.status === "verified" && (
          <TouchableOpacity
            style={styles.actionButtonProgress}
            onPress={() => onUpdateStatus(report.id, "in_progress")}
          >
            <Text style={styles.actionButtonText}>Proses</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 6,
  },
  timestamp: {
    fontSize: 10,
    color: "#94A3B8",
  },
  actionButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButtonProgress: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
