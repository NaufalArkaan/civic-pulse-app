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

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

import { Report, ReportStatus } from "../types/report";
import { useReportSearch } from "../hooks/useReportSearch";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { LAYOUT_CONSTRAINTS } from "../constants/breakpoints";
import {
  getReportPhotoUri,
  isReportUsingVaultMedia,
  isReportDocumentMedia,
  getReportMediaFilename,
  DISASTER_CATEGORY_PHOTOS,
  readDocumentPreviewTextAsync,
  safeShareDocumentOrMediaAsync,
} from "../utils/reportMedia";
import {
  ReportSearchBar,
  ReportFilterBar,
  ReportSyncBanner,
  ReportList,
  ReportCreateModal,
} from "../components/reports";
import {
  AnimatedPressable,
  FeedbackToast,
  CivicImage,
  FloatingNavBar,
} from "../components/common";

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    createWithVaultUri?: string;
    createWithVaultName?: string;
    createWithVaultCategory?: "photo" | "document" | "other";
  }>();
  const { width, height, centeredContainerStyle } = useResponsiveLayout();

  // State untuk modal detail laporan & pembaca dokumen in-app
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailDocPreview, setDetailDocPreview] = useState<string | null>(null);
  const [isDocReaderVisible, setIsDocReaderVisible] = useState<boolean>(true);
  const [isExportingDoc, setIsExportingDoc] = useState<boolean>(false);

  useEffect(() => {
    setDetailDocPreview(null);
    setIsDocReaderVisible(true);

    let isMounted = true;
    if (selectedReport && isReportDocumentMedia(selectedReport)) {
      readDocumentPreviewTextAsync(selectedReport.mediaPath, {
        title: selectedReport.title,
        description: selectedReport.description,
        category: selectedReport.category,
        createdAt: selectedReport.createdAt,
      }).then((res) => {
        if (isMounted) {
          setDetailDocPreview(res.content);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedReport]);

  // State untuk modal pembuatan laporan baru (Supabase Backed)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState<boolean>(false);

  // Jika dialihkan dari Document Vault dengan berkas yang dipilih, buka modal lapor otomatis
  useEffect(() => {
    if (params?.createWithVaultUri) {
      setIsCreateModalVisible(true);
    }
  }, [params?.createWithVaultUri]);

  // Handler membuka/mengekspor berkas dokumen lampiran secara fail-safe
  const handleOpenDetailDoc = useCallback(async () => {
    if (!selectedReport?.mediaPath || isExportingDoc) return;
    setIsExportingDoc(true);
    try {
      const res = await safeShareDocumentOrMediaAsync({
        uri: selectedReport.mediaPath,
        displayName: getReportMediaFilename(selectedReport) || `Bukti_${selectedReport.id}.pdf`,
        fallbackTitle: selectedReport.title,
        fallbackDescription: selectedReport.description,
      });
      if (!res.success && res.error) {
        Alert.alert("Info Ekspor Dokumen", res.error);
      }
    } finally {
      setIsExportingDoc(false);
    }
  }, [selectedReport, isExportingDoc]);

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
          "Disimpan di Outbox Offline (Laporan akan disinkronkan saat online)"
        );
      } else if (res.syncOutcome === "confirmed_remote") {
        setToastType("success");
        setToastMessage("Laporan baru berhasil disinkronkan ke server");
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
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View style={[styles.contentWrapper, centeredContainerStyle]}>
          {/* Top Header Bar — minimalis, hanya judul dan tombol kembali ke peta */}
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
                <Text style={styles.subtitle}>Real-Time Feed</Text>
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

      {/* Floating Pill Bottom Navigation (Sesuai Desain Referensi) */}
      <FloatingNavBar
        currentTab="reports"
        onPressAction={() => setIsCreateModalVisible(true)}
        actionLabel="+ Lapor"
        actionIcon="⚡"
      />

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
              {/* Bukti Media Terlampir (Foto atau Dokumen PDF dari Document Vault) */}
              {selectedReport && isReportDocumentMedia(selectedReport) ? (
                <View style={styles.detailDocContainer}>
                  <View style={styles.detailDocCard}>
                    <Text style={styles.detailDocIcon}>📄</Text>
                    <View style={styles.detailDocTextGroup}>
                      <Text style={styles.detailDocTitle} numberOfLines={1}>
                        {getReportMediaFilename(selectedReport)}
                      </Text>
                      <Text style={styles.detailDocBadge}>
                        🔒 Dokumen Bukti Lapangan (Document Vault)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailDocActionRow}>
                    <AnimatedPressable
                      style={styles.detailDocToggleBtn}
                      onPress={() => setIsDocReaderVisible((prev) => !prev)}
                      accessibilityRole="button"
                      accessibilityLabel="Tampilkan atau sembunyikan isi dokumen"
                    >
                      <Text style={styles.detailDocToggleText}>
                        {isDocReaderVisible ? "🔽 Tutup Bacaan" : "📖 Baca Dokumen In-App"}
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      style={styles.detailDocOpenBtn}
                      onPress={handleOpenDetailDoc}
                      accessibilityRole="button"
                      accessibilityLabel="Ekspor atau bagikan dokumen PDF lampiran"
                    >
                      <Text style={styles.detailDocOpenText}>
                        {isExportingDoc ? "Menyiapkan..." : "📤 Ekspor PDF"}
                      </Text>
                    </AnimatedPressable>
                  </View>

                  {isDocReaderVisible && detailDocPreview && (
                    <View style={styles.detailDocPreviewBox}>
                      <Text style={styles.detailDocPreviewHeader}>
                        📑 Isi Dokumen Lampiran (In-App Reader):
                      </Text>
                      <Text style={styles.detailDocPreviewText}>
                        {detailDocPreview}
                      </Text>
                    </View>
                  )}
                </View>
              ) : selectedReport ? (
                <View style={styles.detailPhotoContainer}>
                  <CivicImage
                    uri={getReportPhotoUri(selectedReport)}
                    fallbackUri={DISASTER_CATEGORY_PHOTOS[selectedReport.category]}
                    category={selectedReport.category}
                    style={styles.detailPhoto}
                    label={selectedReport.title}
                  />
                  <View style={styles.detailPhotoBadge}>
                    <Text style={styles.detailPhotoBadgeText}>
                      {isReportUsingVaultMedia(selectedReport)
                        ? `🔒 Bukti Foto Asli Warga (Document Vault)`
                        : "📸 Foto Dokumentasi Mitigasi (SDG 11)"}
                    </Text>
                  </View>
                </View>
              ) : null}

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
        initialVaultFileUri={params?.createWithVaultUri}
        initialVaultFileName={params?.createWithVaultName}
        initialVaultFileType={params?.createWithVaultCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoid: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.05)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 19,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#334155",
    fontSize: 12.5,
    fontWeight: "700",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 1,
    fontWeight: "500",
  },
  headerActionGroup: {
    // Removed — tombol navigasi sudah tersedia di FloatingNavBar
    display: "none",
  },
  createReportButton: {
    // Removed — tombol + Lapor sudah tersedia di FloatingNavBar
    display: "none",
  },
  createReportButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  vaultButton: {
    // Removed — tombol Vault sudah tersedia di FloatingNavBar
    display: "none",
  },
  vaultButtonText: {
    color: "#334155",
    fontSize: 12,
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
    borderRadius: 28,
    padding: 20,
    width: "100%",
    maxWidth: LAYOUT_CONSTRAINTS.maxModalWidth,
    maxHeight: "80%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
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
  detailPhotoContainer: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailPhoto: {
    width: "100%",
    height: "100%",
  },
  detailPhotoBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailPhotoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  detailDocContainer: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  detailDocCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailDocIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  detailDocTextGroup: {
    flex: 1,
  },
  detailDocTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  detailDocBadge: {
    fontSize: 10.5,
    color: "#15803D",
    marginTop: 2,
    fontWeight: "600",
  },
  detailDocActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailDocToggleBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailDocToggleText: {
    color: "#166534",
    fontSize: 11.5,
    fontWeight: "700",
  },
  detailDocOpenBtn: {
    flex: 1,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailDocOpenText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  detailDocPreviewBox: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  detailDocPreviewHeader: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#15803D",
    marginBottom: 4,
  },
  detailDocPreviewText: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16.5,
  },
});
