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

import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Report } from "../types/report";
import { useReportSearch } from "../hooks/useReportSearch";
import {
  ReportSearchBar,
  ReportFilterBar,
  ReportSyncBanner,
  ReportList,
} from "../components/reports";

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State untuk modal detail laporan
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const {
    reports,
    loading,
    error,
    isFromCache,
    criteria,
    networkState,
    syncState,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    refresh,
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
  }, [setSearchQuery, setCategoryFilter, setStatusFilter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToMap}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke peta interaktif"
          >
            <Text style={styles.backButtonText}>← Peta</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Laporan & Mitigasi</Text>
            <Text style={styles.subtitle}>Real-Time Pipeline & RxJS Search</Text>
          </View>

          <TouchableOpacity
            style={styles.vaultButton}
            onPress={() => router.push("/vault" as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Buka Document Vault"
          >
            <Text style={styles.vaultButtonText}>🔐 Vault</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Network Connectivity & Realtime Outbox Banner */}
      <ReportSyncBanner
        networkState={networkState}
        syncState={syncState}
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

      {/* Reports Scrollable Feed */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#208AEF"
            colors={["#208AEF"]}
          />
        }
      >
        {/* Error Alert with Retry Action */}
        {error && (
          <View style={styles.errorBanner}>
            <View style={styles.errorContent}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Virtualized Report Feed */}
        <ReportList
          reports={reports}
          loading={loading}
          isFromCache={isFromCache}
          onUpdateStatus={updateReportStatus}
          onPressItem={setSelectedReport}
          onResetFilters={handleResetFilters}
        />
      </ScrollView>

      {/* Detail Modal Pop-up */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedReport?.title}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedReport(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
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

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => setSelectedReport(null)}
            >
              <Text style={styles.modalActionBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
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
  vaultButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    backgroundColor: "#334155",
    borderRadius: 8,
    marginLeft: 8,
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
    maxWidth: 380,
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
