/**
 * Civic Pulse - Modul LBS
 * Component: SelectedReportCard
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SelectedReportCardProps } from "../../types/components";
import { CivicReportSeverity } from "../../types/report";

const SEVERITY_LABELS: Record<CivicReportSeverity, { label: string; color: string }> = {
  high: { label: "Kritis / Tinggi", color: "#DC2626" },
  medium: { label: "Sedang", color: "#D97706" },
  low: { label: "Rendah", color: "#059669" },
};

export const SelectedReportCard = memo(function SelectedReportCard({
  report,
  distanceFormatted,
  onClose,
}: SelectedReportCardProps) {
  const severityInfo = SEVERITY_LABELS[report.severity];

  return (
    <View style={styles.cardContainer}>
      {/* Header bar */}
      <View style={styles.headerRow}>
        <View style={styles.simulationBadge}>
          <Text style={styles.simulationBadgeText}>DATA SIMULASI</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title}>{report.title}</Text>

      {/* Meta info: Severity & Haversine Distance */}
      <View style={styles.metaRow}>
        <View style={[styles.severityBadge, { backgroundColor: severityInfo.color + "18" }]}>
          <Text style={[styles.severityText, { color: severityInfo.color }]}>
            Tingkat: {severityInfo.label}
          </Text>
        </View>

        <View style={styles.distanceBadge}>
          <Text style={styles.distanceLabel}>Jarak Garis Lurus:</Text>
          <Text style={styles.distanceValue}>{distanceFormatted}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>
        {report.description}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
  simulationBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  simulationBadgeText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
  description: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
});

