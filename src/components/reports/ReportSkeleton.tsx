/**
 * Civic Pulse - Pertemuan 12
 * Component: ReportSkeleton (Card Placeholder Feed)
 * Role: Anggota 2 (Lead Frontend) & Anggota 1 (Lead System Architect)
 *
 * State Loading Guidelines:
 * - Meniru struktur visual `ReportItem` (header, judul, deskripsi, metadata).
 * - Ditampilkan secara terukur (3 kartu) hanya pada saat inisialisasi awal (cold start).
 * - Tidak mendominasi layar saat data cache telah tersedia.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { SkeletonLoader } from "../common/SkeletonLoader";
import { THEME } from "../../constants/theme";

export function ReportSkeletonCard() {
  return (
    <View style={styles.card}>
      {/* Top Header Placeholder: Category Badge + Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <SkeletonLoader width={110} height={22} borderRadius={THEME.radius.sm} />
          <SkeletonLoader width={80} height={22} borderRadius={THEME.radius.sm} />
        </View>
        <SkeletonLoader width={65} height={14} borderRadius={THEME.radius.sm} />
      </View>

      {/* Title Placeholder */}
      <SkeletonLoader width="85%" height={18} style={styles.title} />

      {/* Description Placeholder: 2 Lines */}
      <SkeletonLoader width="100%" height={13} style={styles.descLine} />
      <SkeletonLoader width="70%" height={13} style={styles.descLine} />

      {/* Footer Metadata: Location & Severity Badges */}
      <View style={styles.footerRow}>
        <SkeletonLoader width={120} height={18} borderRadius={THEME.radius.sm} />
        <SkeletonLoader width={75} height={18} borderRadius={THEME.radius.sm} />
      </View>
    </View>
  );
}

export function ReportSkeletonList() {
  return (
    <View style={styles.listContainer} accessibilityLabel="Memuat daftar laporan">
      <ReportSkeletonCard />
      <ReportSkeletonCard />
      <ReportSkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderLight,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeGroup: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    marginBottom: 10,
  },
  descLine: {
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
});
