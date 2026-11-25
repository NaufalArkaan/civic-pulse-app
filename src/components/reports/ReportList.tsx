/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportList (Virtualized Reactive Feed)
 * Role: Anggota 2 (Lead Frontend & Reactive UI Specialist)
 *
 * Performance Safeguards:
 * - Menggunakan `FlatList` dengan virtualisasi window untuk menjaga 60 FPS dan stabilitas scroll.
 * - Key stabil berbasis ID unik entitas (`item.id`).
 * - Memoized `renderItem` untuk mencegah pembentukan fungsi baru pada setiap siklus frame.
 * - Loading indicator non-intrusif yang tidak menghapus data yang sedang dibaca pengguna.
 * - Empty state informatif dengan tombol reset kriteria pencarian.
 */

import React, { memo, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import { Report, ReportStatus } from "../../types/report";
import { ReportItem } from "./ReportItem";
import { ReportSkeletonList } from "./ReportSkeleton";
import { AnimatedPressable } from "../common/AnimatedPressable";

type ReportListProps = {
  reports: Report[];
  loading: boolean;
  isFromCache: boolean;
  onUpdateStatus?: (id: string, newStatus: ReportStatus) => void;
  onPressItem?: (report: Report) => void;
  onResetFilters?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  refreshControl?: React.ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
};

export const ReportList = memo(function ReportList({
  reports,
  loading,
  isFromCache,
  onUpdateStatus,
  onPressItem,
  onResetFilters,
  ListHeaderComponent,
  refreshControl,
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
}: ReportListProps) {
  const renderItem: ListRenderItem<Report> = useCallback(
    ({ item }) => (
      <ReportItem
        report={item}
        onUpdateStatus={onUpdateStatus}
        onPressItem={onPressItem}
      />
    ),
    [onUpdateStatus, onPressItem]
  );

  const keyExtractor = useCallback((item: Report) => item.id, []);

  // Empty state component
  const renderEmptyComponent = useCallback(() => {
    // Initial Cold Start: Skeletons placeholder
    if (loading && reports.length === 0) {
      return <ReportSkeletonList />;
    }

    // Filter or Search yields zero results
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Text style={styles.emptyIcon}>🔍</Text>
        </View>
        <Text style={styles.emptyTitle}>Tidak Ada Laporan yang Cocok</Text>
        <Text style={styles.emptySubtitle}>
          Kombinasi kata kunci pencarian, kategori, atau status yang Anda pilih tidak menghasilkan
          laporan di pangkalan data.
        </Text>

        {onResetFilters && (
          <AnimatedPressable
            style={styles.resetButton}
            onPress={onResetFilters}
            accessibilityRole="button"
            accessibilityLabel="Reset kriteria pencarian dan filter"
          >
            <Text style={styles.resetButtonText}>🔄 Reset Semua Filter</Text>
          </AnimatedPressable>
        )}
      </View>
    );
  }, [loading, reports.length, onResetFilters]);

  // Header element memoized sebagai ReactElement (bukan component function)
  // untuk menjaga fokus TextInput di ReportSearchBar dan menghindari remount (>16ms spike)
  const headerElement = useMemo(() => {
    return (
      <View>
        {ListHeaderComponent}

        {/* Offline Cache Notice Banner */}
        {isFromCache && (
          <View style={styles.cacheNotice}>
            <Text style={styles.cacheNoticeText}>
              📦 Mode Offline / Cache Lokal: Menampilkan data tersimpan dari SQLite
            </Text>
          </View>
        )}

        {/* Subtle In-flight Pipeline Indicator */}
        {loading && reports.length > 0 && (
          <View style={styles.inlineLoadingBar}>
            <ActivityIndicator size="small" color="#208AEF" />
            <Text style={styles.inlineLoadingText}>Menyinkronkan hasil pencarian...</Text>
          </View>
        )}
      </View>
    );
  }, [ListHeaderComponent, isFromCache, loading, reports.length]);

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={headerElement}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  cacheNotice: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cacheNoticeText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "700",
    textAlign: "center",
  },
  inlineLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 8,
  },
  inlineLoadingText: {
    fontSize: 11.5,
    color: "#1E40AF",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  resetButton: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1D4ED8",
  },
});
