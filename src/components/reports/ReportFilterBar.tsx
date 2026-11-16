/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportFilterBar
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { CivicReportCategory, ReportStatus } from "../../types/report";

type ReportFilterBarProps = {
  selectedCategory: CivicReportCategory | "all";
  onSelectCategory: (category: CivicReportCategory | "all") => void;
  selectedStatus: ReportStatus | "all";
  onSelectStatus: (status: ReportStatus | "all") => void;
};

const CATEGORIES: { label: string; value: CivicReportCategory | "all" }[] = [
  { label: "Semua Kategori", value: "all" },
  { label: "🚧 Jalan", value: "road-damage" },
  { label: "🌊 Banjir", value: "flood" },
  { label: "⚠️ Longsor", value: "landslide" },
  { label: "💡 Lampu PJU", value: "street-light" },
];

const STATUSES: { label: string; value: ReportStatus | "all" }[] = [
  { label: "Semua Status", value: "all" },
  { label: "Diajukan", value: "submitted" },
  { label: "Terverifikasi", value: "verified" },
  { label: "Diproses", value: "in_progress" },
  { label: "Selesai", value: "resolved" },
];

export const ReportFilterBar = memo(function ReportFilterBar({
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
}: ReportFilterBarProps) {
  return (
    <View style={styles.container}>
      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSelectCategory(cat.value)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScrollContent}>
        {STATUSES.map((st) => {
          const isActive = selectedStatus === st.value;
          return (
            <TouchableOpacity
              key={st.value}
              style={[styles.statusPill, isActive && styles.statusPillActive]}
              onPress={() => onSelectStatus(st.value)}
            >
              <Text style={[styles.statusPillText, isActive && styles.statusPillTextActive]}>{st.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 4,
  },
  statusScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingTop: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillActive: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  statusPillActive: {
    backgroundColor: "#334155",
    borderColor: "#334155",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
  },
});
