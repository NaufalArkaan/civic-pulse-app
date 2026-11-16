/**
 * Civic Pulse - Pertemuan 11
 * Screen: Real-Time Reports & Reactive Search Screen (SDG 11)
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 *
 * Integrasi Modul P11:
 * - RxJS Search & Filter Pipeline: Anggota 1 & Anggota 2 (Syahril)
 * - Real-Time Stream Provider (Supabase / Mock): Anggota 1 (Naufal)
 * - Local Cache & Outbox Sync: Anggota 1 & Anggota 3 (Robi)
 */

import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

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

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToMap}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke peta"
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
            accessibilityRole="button"
            accessibilityLabel="Buka Document Vault"
          >
            <Text style={styles.vaultButtonText}>🔐 Vault</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Realtime Stream & Network Sync Banner */}
      <ReportSyncBanner
        networkState={networkState}
        syncState={syncState}
        onSimulateRealtime={simulateIncomingReport}
        onProcessOutbox={processOutbox}
      />

      {/* RxJS Search Bar & Filter Chips */}
      <ReportSearchBar
        value={criteria.query}
        onChangeText={setSearchQuery}
        loading={loading}
      />

      <ReportFilterBar
        selectedCategory={criteria.category || "all"}
        onSelectCategory={setCategoryFilter}
        selectedStatus={criteria.status || "all"}
        onSelectStatus={setStatusFilter}
      />

      {/* Reports List */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#208AEF" />}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <ReportList
          reports={reports}
          loading={loading}
          isFromCache={isFromCache}
          onUpdateStatus={updateReportStatus}
        />
      </ScrollView>
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#334155",
    borderRadius: 8,
    marginRight: 8,
  },
  backButtonText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
  },
  vaultButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#334155",
    borderRadius: 8,
    marginLeft: 8,
  },
  vaultButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
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
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
  },
});
