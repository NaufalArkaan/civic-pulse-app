/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportSyncBanner
 * Role: Anggota 2 (Lead Frontend & Reactive UI Specialist)
 *
 * Citizen-Friendly Network & Synchronization Feedback:
 * - Menampilkan status koneksi internet secara jelas dan transparan tanpa jargon teknis membingungkan.
 * - Feedback status outbox queue ketika ada aksi laporan yang tersimpan saat offline.
 * - Fasilitas demonstrasi interaktif untuk pengujian live stream realtime & offline toggle.
 */

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NetworkState, SyncState } from "../../types/sync";
import { networkService } from "../../services/network/networkService";
import { AnimatedPressable } from "../common/AnimatedPressable";

type ReportSyncBannerProps = {
  networkState: NetworkState;
  syncState: SyncState;
  providerName?: string;
  onSimulateRealtime: () => void;
  onProcessOutbox: () => void;
};

export const ReportSyncBanner = memo(function ReportSyncBanner({
  networkState,
  syncState,
  providerName = "Offline-First Local Stream",
  onSimulateRealtime,
  onProcessOutbox,
}: ReportSyncBannerProps) {
  const isOnline = networkState.status === "online";
  const isReconnecting = networkState.status === "reconnecting";

  function handleToggleNetworkSimulation() {
    if (isOnline) {
      networkService.simulateNetworkState("offline");
    } else {
      networkService.simulateNetworkState("online");
    }
  }

  return (
    <View style={styles.container}>
      {/* Network Connectivity Status Row */}
      <View style={styles.statusRow}>
        <View style={styles.leftStatus}>
          <View
            style={[
              styles.statusIndicator,
              isOnline
                ? styles.indicatorOnline
                : isReconnecting
                ? styles.indicatorReconnecting
                : styles.indicatorOffline,
            ]}
          />
          <Text style={styles.statusText}>
            {isOnline
              ? "🟢 Terhubung — Realtime Aktif"
              : isReconnecting
              ? "🟠 Menyambung Ulang..."
              : "🔴 Mode Offline — Menampilkan Data Tersimpan"}
          </Text>
        </View>

        {/* Development Network Toggle Simulation */}
        <AnimatedPressable
          style={[styles.simButton, !isOnline && styles.simButtonOffline]}
          onPress={handleToggleNetworkSimulation}
          accessibilityRole="button"
          accessibilityLabel="Ubah simulasi status jaringan"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.simButtonText, !isOnline && styles.simButtonTextOffline]}>
            {isOnline ? "Simulasi Offline" : "Simulasi Online"}
          </Text>
        </AnimatedPressable>
      </View>

      {/* Sync State & Interactive Live Trigger */}
      <View style={styles.syncRow}>
        <View style={styles.syncInfo}>
          <Text style={styles.providerLabel}>
            Stream: <Text style={styles.bold}>{providerName}</Text>
          </Text>

          {syncState === "pending" && (
            <AnimatedPressable
              onPress={onProcessOutbox}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Kirim laporan yang tertunda di antrean outbox"
            >
              <Text style={styles.outboxPendingText}>
                ⏳ Ada laporan di outbox • Ketuk untuk kirim
              </Text>
            </AnimatedPressable>
          )}

          {syncState === "syncing" && (
            <Text style={styles.outboxSyncingText}>
              🔄 Sedang menyinkronkan laporan ke server...
            </Text>
          )}
        </View>

        {/* Live Event Trigger Button */}
        <AnimatedPressable
          style={styles.emitEventButton}
          onPress={onSimulateRealtime}
          accessibilityRole="button"
          accessibilityLabel="Kirim event laporan baru langsung via realtime stream"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.emitEventButtonText}>⚡ Kirim Event Live</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  leftStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 8,
  },
  indicatorOnline: {
    backgroundColor: "#10B981",
  },
  indicatorReconnecting: {
    backgroundColor: "#F59E0B",
  },
  indicatorOffline: {
    backgroundColor: "#EF4444",
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  simButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  simButtonOffline: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  simButtonText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  simButtonTextOffline: {
    color: "#059669",
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  syncInfo: {
    flex: 1,
    marginRight: 8,
  },
  providerLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  bold: {
    fontWeight: "700",
    color: "#334155",
  },
  outboxPendingText: {
    fontSize: 10.5,
    color: "#D97706",
    fontWeight: "800",
    marginTop: 2,
  },
  outboxSyncingText: {
    fontSize: 10.5,
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 2,
  },
  emitEventButton: {
    backgroundColor: "#208AEF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: "#208AEF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  emitEventButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});
