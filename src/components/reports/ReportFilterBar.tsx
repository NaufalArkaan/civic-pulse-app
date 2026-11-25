/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportFilterBar
 * Role: Anggota 2 (Lead Frontend & Reactive UI Specialist)
 *
 * Filter Chips & Accessibility:
 * - Filter kategori insiden dan status workflow laporan yang terhubung langsung ke stream kriteria RxJS.
 * - Tombol reset kriteria aktif untuk mempermudah navigasi pengguna.
 * - Target sentuh dan kontras visual memenuhi standar WCAG AAA.
 */

import React, { memo, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { CivicReportCategory, ReportStatus } from "../../types/report";
import { AnimatedPressable } from "../common/AnimatedPressable";

type ReportFilterBarProps = {
  selectedCategory: CivicReportCategory | "all";
  onSelectCategory: (category: CivicReportCategory | "all") => void;
  selectedStatus: ReportStatus | "all";
  onSelectStatus: (status: ReportStatus | "all") => void;
  onResetFilters?: () => void;
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
  onResetFilters,
}: ReportFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const isFilterActive = selectedCategory !== "all" || selectedStatus !== "all";

  const selectedCategoryLabel =
    CATEGORIES.find((c) => c.value === selectedCategory)?.label || "Semua";
  const selectedStatusLabel =
    STATUSES.find((s) => s.value === selectedStatus)?.label || "Semua";

  return (
    <View style={styles.container}>
      {/* Category Pills Header with Expand/Collapse & Reset */}
      <View style={styles.labelRow}>
        <View style={styles.headingGroup}>
          <Text style={styles.filterSectionLabel}>Filter & Kategori</Text>
          <AnimatedPressable
            style={styles.toggleExpandBtn}
            onPress={() => setIsExpanded((prev) => !prev)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? "Sembunyikan panel filter" : "Tampilkan panel filter"}
          >
            <Text style={styles.toggleExpandText}>
              {isExpanded ? "▲ Tutup" : "▼ Buka Filter"}
            </Text>
          </AnimatedPressable>
        </View>

        {isFilterActive && onResetFilters && (
          <AnimatedPressable
            onPress={onResetFilters}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Reset semua filter kriteria"
          >
            <Text style={styles.resetText}>✕ Reset</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Collapsed State: Compact Summary Pill */}
      {!isExpanded && (
        <View style={styles.collapsedSummaryRow}>
          <Text style={styles.collapsedSummaryText}>
            Aktif: <Text style={styles.bold}>{selectedCategoryLabel}</Text> •{" "}
            <Text style={styles.bold}>{selectedStatusLabel}</Text>
          </Text>
        </View>
      )}

      {/* Expanded State: Horizontal Scroll Filters */}
      {isExpanded && (
        <>
          {/* Category Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <AnimatedPressable
                  key={cat.value}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => onSelectCategory(cat.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter kategori ${cat.label}`}
                  accessibilityState={{ selected: isActive }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {cat.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {/* Status Filter Horizontal Scroll */}
          <View style={styles.labelRowStatus}>
            <Text style={styles.filterSectionSubLabel}>Status Penanganan:</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusScrollContent}
          >
            {STATUSES.map((st) => {
              const isActive = selectedStatus === st.value;
              return (
                <AnimatedPressable
                  key={st.value}
                  style={[styles.statusPill, isActive && styles.statusPillActive]}
                  onPress={() => onSelectStatus(st.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter status ${st.label}`}
                  accessibilityState={{ selected: isActive }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={[styles.statusPillText, isActive && styles.statusPillTextActive]}>
                    {st.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headingGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleExpandBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toggleExpandText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0369A1",
  },
  collapsedSummaryRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  collapsedSummaryText: {
    fontSize: 11.5,
    color: "#64748B",
  },
  bold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  labelRowStatus: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.3,
  },
  filterSectionSubLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.3,
  },
  resetText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 2,
  },
  statusScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 2,
  },
  pill: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
    elevation: 2,
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  statusPill: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillActive: {
    backgroundColor: "#1E293B",
    borderColor: "#1E293B",
    elevation: 2,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
  },
});
