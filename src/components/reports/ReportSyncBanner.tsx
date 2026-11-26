/**
 * Civic Pulse - Pertemuan 11–13
 * Component: ReportSyncBanner
 * Role: Anggota 2 (Lead Frontend & Reactive UI Specialist) & Anggota 1 (System Architect)
 *
 * Citizen-Friendly Network & Synchronization Feedback:
 * - Menampilkan status koneksi secara bersih tanpa mengekspos URL/API Stream backend.
 * - Tata letak Flexbox adaptif (flexShrink & flexWrap) agar tombol "Simulasi Online / Offline"
 *   dan "Kirim Event Live" tidak pernah terpotong (clipping) pada ukuran layar apa pun.
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
      {/* Baris 1: Status Jaringan & Tombol Toggle Online/Offline (Anti-Clipping) */}
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
          <Text style={styles.statusText} numberOfLines={2}>
            {isOnline
              ? "🟢 Terhubung — Sinkronisasi Aktif"
              : isReconnecting
              ? "🟠 Menyambung Ulang..."
              : "🔴 Mode Offline — Data Lokal"}
          </Text>
        </View>

        <AnimatedPressable
          style={[styles.simButton, !isOnline && styles.simButtonOffline]}
          onPress={handleToggleNetworkSimulation}
          accessibilityRole="button"
          accessibilityLabel="Ubah simulasi status jaringan"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[styles.simButtonText, !isOnline && styles.simButtonTextOffline]}
            numberOfLines={1}
          >
            {isOnline ? "Mode Offline" : "Mode Online"}
          </Text>
        </AnimatedPressable>
      </View>

      {/* Baris 2: Status Antrean Sinkronisasi & Aksi Laporan Live (Tanpa Ekspos Stream API) */}
      <View style={styles.syncRow}>
        <View style={styles.syncInfo}>
          {syncState === "pending" ? (
            <AnimatedPressable
              onPress={onProcessOutbox}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Kirim laporan yang tertunda di antrean outbox"
            >
              <Text style={styles.outboxPendingText}>
                ⏳ Ada perubahan di antrean lokal • Ketuk untuk sinkronkan
              </Text>
            </AnimatedPressable>
          ) : syncState === "syncing" ? (
            <Text style={styles.outboxSyncingText}>
              🔄 Sedang menyinkronkan perubahan ke database...
            </Text>
          ) : (
            <Text style={styles.syncReadyText}>
              ✓ Semua status laporan tersinkronisasi
            </Text>
          )}
        </View>

        <AnimatedPressable
          style={styles.emitEventButton}
          onPress={onSimulateRealtime}
          accessibilityRole="button"
          accessibilityLabel="Tambah laporan darurat baru secara langsung"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.emitEventButtonText} numberOfLines={1}>
            ⚡ + Laporan Live
          </Text>
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
    gap: 10,
  },
  leftStatus: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  statusIndicator: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 8,
    flexShrink: 0,
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
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  simButton: {
    flexShrink: 0,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  simButtonOffline: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  simButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  simButtonTextOffline: {
    color: "#059669",
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  syncInfo: {
    flex: 1,
  },
  syncReadyText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  outboxPendingText: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "800",
  },
  outboxSyncingText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "700",
  },
  emitEventButton: {
    flexShrink: 0,
    backgroundColor: "#208AEF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
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
