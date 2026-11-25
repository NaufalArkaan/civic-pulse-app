/**
 * Civic Pulse - Pertemuan 11
 * Screen: Real-Time Reports & Reactive Search Feed (SDG 11)
 * Role: Anggota 1 (System Architect) & Anggota 2 (Lead Frontend & Reactive UI Specialist)
 *
 * Integrasi Modul P11:
 * - RxJS Search & Filter Pipeline (debounceTime, distinctUntilChanged, switchMap): Anggota 1 & Anggota 2 (Syahril)
 * - Realtime Data Stream (INSERT/UPDATE/DELETE events): Anggota 1 (Naufal) & Anggota 2 (Syahril)
 * - Local SQLite Cache & Outbox Queue: Anggota 3 (Robi)
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Report, ReportStatus } from "../types/report";
import { useReportSearch } from "../hooks/useReportSearch";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { LAYOUT_CONSTRAINTS } from "../constants/breakpoints";
import {
  ReportSearchBar,
  ReportFilterBar,
  ReportSyncBanner,
  ReportList,
  ReportCreateModal,
} from "../components/reports";
import { AnimatedPressable, FeedbackToast } from "../components/common";

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height, centeredContainerStyle } = useResponsiveLayout();

  // State untuk modal detail laporan
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // State untuk modal pembuatan laporan baru (Supabase Backed)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState<boolean>(false);

  // State umpan balik mikro (Toast) dengan tipe jujur (success / error / info)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  const handleDismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const {
    reports,
    loading,
    error,
    isFromCache,
    criteria,
    networkState,
    syncState,
    activeProviderName,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    refresh,
    createReport,
    updateReportStatus,
    processOutbox,
    simulateIncomingReport,
  } = useReportSearch();

  const handleBackToMap = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  /**
   * Reset seluruh filter dan pencarian ke kriteria awal
   */
  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setToastType("info");
    setToastMessage("Kriteria filter telah direset");
  }, [setSearchQuery, setCategoryFilter, setStatusFilter]);

  /**
   * Pembaharuan status laporan secara jujur (Check 2):
   * - Membedakan konfirmasi server vs masuk antrean outbox offline vs gagal validasi.
   */
  const handleUpdateStatus = useCallback(
    async (id: string, newStatus: ReportStatus) => {
      const statusNames: Record<ReportStatus, string> = {
        submitted: "Diajukan",
        verified: "Terverifikasi",
        in_progress: "Sedang Diproses",
        resolved: "Telah Selesai",
        rejected: "Ditolak",
      };
      const label = statusNames[newStatus] || newStatus;
      const res = await updateReportStatus(id, newStatus);

      if (!res.success) {
        setToastType("error");
        setToastMessage(res.error || "Gagal memperbarui status laporan.");
        return;
      }

      if (res.syncOutcome === "queued_offline") {
        setToastType("info");
        setToastMessage(
          `Status '${label}' disimpan di Outbox Lokal (Menunggu konfirmasi server saat online)`
        );
      } else if (res.syncOutcome === "confirmed_remote") {
        setToastType("success");
        setToastMessage(`Terkonfirmasi Server: Status laporan diperbarui ke '${label}'`);
      } else {
        setToastType("success");
        setToastMessage(`Status laporan diperbarui secara lokal: ${label}`);
      }
    },
    [updateReportStatus]
  );

  /**
   * Pembuatan laporan baru secara jujur (Check 2 & Supabase Hardening):
   * - Membedakan konfirmasi server vs antrean outbox offline vs kegagalan validasi.
   */
  const handleCreateReport = useCallback(
    async (newReportData: Omit<Report, "id" | "createdAt" | "updatedAt">) => {
      const res = await createReport(newReportData);

      if (!res.success) {
        setToastType("error");
        setToastMessage(res.error || "Gagal mengirim laporan.");
        return res;
      }

      if (res.syncOutcome === "queued_offline") {
        setToastType("info");
        setToastMessage(
          "Disimpan di Outbox Offline (Laporan akan disinkronkan ke Supabase saat online)"
        );
      } else if (res.syncOutcome === "confirmed_remote") {
        setToastType("success");
        setToastMessage("Terkonfirmasi Server: Laporan baru berhasil dibuat di Supabase");
      } else {
        setToastType("success");
        setToastMessage("Laporan baru berhasil disimpan");
      }

      return res;
    },
    [createReport]
  );

  // Komponen header virtualized list (Search, Filter, Sync Banner, Toast & Error)
  const listHeader = useMemo(() => {
    return (
      <View style={styles.headerFeedContainer}>
        {/* Network Connectivity & Realtime Outbox Banner */}
        <ReportSyncBanner
          networkState={networkState}
          syncState={syncState}
          providerName={activeProviderName}
          onSimulateRealtime={simulateIncomingReport}
          onProcessOutbox={processOutbox}
        />

        {/* Reactive Search Bar */}
        <ReportSearchBar
          value={criteria.query}
          onChangeText={setSearchQuery}
          loading={loading}
          resultCount={reports.length}
        />

        {/* Category & Status Filter Chips */}
        <ReportFilterBar
          selectedCategory={criteria.category || "all"}
          onSelectCategory={setCategoryFilter}
          selectedStatus={criteria.status || "all"}
          onSelectStatus={setStatusFilter}
          onResetFilters={handleResetFilters}
        />

        {/* Dynamic Feedback Toast */}
        <FeedbackToast
          message={toastMessage}
          type={toastType}
          onDismiss={handleDismissToast}
        />

        {/* Error Alert with Retry Action */}
        {error && (
          <View style={styles.errorBanner}>
            <View style={styles.errorContent}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
            <AnimatedPressable style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    );
  }, [
    networkState,
    syncState,
    activeProviderName,
    simulateIncomingReport,
    processOutbox,
    criteria.query,
    criteria.category,
    criteria.status,
    setSearchQuery,
    loading,
    reports.length,
    setCategoryFilter,
    setStatusFilter,
    handleResetFilters,
    toastMessage,
    toastType,
    handleDismissToast,
    error,
    refresh,
  ]);

  const modalResponsiveWidth = Math.min(width - 32, LAYOUT_CONSTRAINTS.maxModalWidth);
  const modalMaxHeight = height > 500 ? 560 : height - 40;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View style={[styles.contentWrapper, centeredContainerStyle]}>
          {/* Top Header Bar */}
          <View style={styles.header}>
            <View style={styles.topRow}>
              <AnimatedPressable
                style={styles.backButton}
                onPress={handleBackToMap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Kembali ke peta interaktif"
              >
                <Text style={styles.backButtonText}>← Peta</Text>
              </AnimatedPressable>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>Laporan & Mitigasi</Text>
                <Text style={styles.subtitle}>Real-Time Pipeline & RxJS Search</Text>
              </View>

              <View style={styles.headerActionGroup}>
                <AnimatedPressable
                  style={styles.createReportButton}
                  onPress={() => setIsCreateModalVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Buat laporan insiden baru"
                >
                  <Text style={styles.createReportButtonText}>+ Lapor</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={styles.vaultButton}
                  onPress={() => router.push("/vault" as any)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Buka Document Vault"
                >
                  <Text style={styles.vaultButtonText}>🔐 Vault</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>

          {/* Virtualized Report Feed with Unified ListHeaderComponent */}
          <ReportList
            reports={reports}
            loading={loading}
            isFromCache={isFromCache}
            onUpdateStatus={handleUpdateStatus}
            onPressItem={setSelectedReport}
            onResetFilters={handleResetFilters}
            ListHeaderComponent={listHeader}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refresh}
                tintColor="#208AEF"
                colors={["#208AEF"]}
              />
            }
          />
        </View>
      </KeyboardAvoidingView>

      {/* Detail Modal Pop-up */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { width: modalResponsiveWidth, maxHeight: modalMaxHeight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedReport?.title}
              </Text>
              <AnimatedPressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedReport(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Tutup dialog rincian laporan"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </AnimatedPressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                {selectedReport?.description}
              </Text>

              <View style={styles.modalMetaBox}>
                <Text style={styles.modalMetaItem}>
                  🏷️ <Text style={styles.bold}>Kategori:</Text> {selectedReport?.category}
                </Text>
                <Text style={styles.modalMetaItem}>
                  📊 <Text style={styles.bold}>Status:</Text> {selectedReport?.status}
                </Text>
                <Text style={styles.modalMetaItem}>
                  📍 <Text style={styles.bold}>Koordinat:</Text>{" "}
                  {selectedReport?.coordinate.latitude.toFixed(4)},{" "}
                  {selectedReport?.coordinate.longitude.toFixed(4)}
                </Text>
                <Text style={styles.modalMetaItem}>
                  📅 <Text style={styles.bold}>Waktu:</Text>{" "}
                  {selectedReport?.createdAt
                    ? new Date(selectedReport.createdAt).toLocaleString("id-ID")
                    : "-"}
                </Text>
              </View>
            </ScrollView>

            <AnimatedPressable
              style={styles.modalActionBtn}
              onPress={() => setSelectedReport(null)}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal rincian"
            >
              <Text style={styles.modalActionBtnText}>Tutup</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Modal Pembuatan Laporan Baru (Supabase & Offline Outbox) */}
      <ReportCreateModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onSubmit={handleCreateReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  keyboardAvoid: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    backgroundColor: "#334155",
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#93C5FD",
    fontSize: 12.5,
    fontWeight: "700",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  headerActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  createReportButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    backgroundColor: "#0284C7",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  createReportButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  vaultButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    backgroundColor: "#334155",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  vaultButtonText: {
    color: "#F8FAFC",
    fontSize: 12.5,
    fontWeight: "700",
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerFeedContainer: {
    backgroundColor: "#F8FAFC",
    paddingTop: 4,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorContent: {
    flex: 1,
    marginRight: 8,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#991B1B",
    fontSize: 11,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    width: "100%",
    maxWidth: LAYOUT_CONSTRAINTS.maxModalWidth,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "bold",
  },
  modalBody: {
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 14,
  },
  modalMetaBox: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  modalMetaItem: {
    fontSize: 12,
    color: "#334155",
  },
  bold: {
    fontWeight: "700",
  },
  modalActionBtn: {
    backgroundColor: "#208AEF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
