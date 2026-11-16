/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportList
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Report, ReportStatus } from "../../types/report";
import { ReportItem } from "./ReportItem";

type ReportListProps = {
  reports: Report[];
  loading: boolean;
  isFromCache: boolean;
  onUpdateStatus?: (id: string, newStatus: ReportStatus) => void;
};

export const ReportList = memo(function ReportList({
  reports,
  loading,
  isFromCache,
  onUpdateStatus,
}: ReportListProps) {
  if (reports.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Tidak Ada Laporan Ditemukan</Text>
        <Text style={styles.emptySubtitle}>
          Coba ubah kata kunci pencarian atau sesuaikan filter kategori/status di atas.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFromCache && (
        <View style={styles.cacheNotice}>
          <Text style={styles.cacheNoticeText}>
            📦 Menampilkan data dari cache lokal (Perangkat sedang offline)
          </Text>
        </View>
      )}

      {reports.map((report) => (
        <ReportItem
          key={report.id}
          report={report}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  cacheNotice: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
  },
  cacheNoticeText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },
});
