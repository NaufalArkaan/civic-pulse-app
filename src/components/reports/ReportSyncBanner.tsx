/**
 * Civic Pulse - Pertemuan 13
 * Component: ReportSyncBanner (Minimalist Connection & Sync Status Card)
 * Role: Anggota 2 (Lead Frontend) & Anggota 3 (Lead Network & Reliability - Robi)
 *
 * Desain Modern & Minimalis:
 * - Pill status koneksi: Online (Emerald Green), Offline (Amber), Syncing (Civic Blue).
 * - Informasi status sinkronisasi laporan yang jujur dan transparan.
 * - Tombol aksi simulasi jaringan yang ringkas.
 */

import React, { memo } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { NetworkState, SyncState } from "../../types/sync";
import { networkService } from "../../services/network/networkService";

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
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        {/* Status Koneksi Pill */}
        <View
          style={[
            styles.statusPill,
            isOnline
              ? styles.statusPillOnline
              : isReconnecting
              ? styles.statusPillReconnecting
              : styles.statusPillOffline,
          ]}
        >
          <View
            style={[
              styles.pulseDot,
              isOnline
                ? styles.pulseDotOnline
                : isReconnecting
                ? styles.pulseDotReconnecting
                : styles.pulseDotOffline,
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              isOnline
                ? styles.statusTextOnline
                : isReconnecting
                ? styles.statusTextReconnecting
                : styles.statusTextOffline,
            ]}
          >
            {isOnline
              ? "Online • Sinkronisasi Aktif"
              : isReconnecting
              ? "Menyambung Ulang..."
              : "Mode Offline • Cache Lokal"}
          </Text>
        </View>

        {/* Action Toggle Network Simulation Pill */}
        <TouchableOpacity
          style={[styles.simPill, !isOnline && styles.simPillOffline]}
          onPress={handleToggleNetworkSimulation}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Ubah simulasi jaringan"
        >
          <Text style={[styles.simPillText, !isOnline && styles.simPillTextOffline]}>
            {isOnline ? "Sim. Offline" : "Kembali Online"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Baris Status Sinkronisasi Laporan & Outbox Queue */}
      {syncState !== "idle" && syncState !== "synced" && (
        <View style={styles.syncStateRow}>
          {syncState === "pending" ? (
            <TouchableOpacity
              onPress={onProcessOutbox}
              activeOpacity={0.7}
              style={styles.pendingOutboxButton}
              accessibilityRole="button"
              accessibilityLabel="Kirim antrean laporan offline sekarang"
            >
              <Text style={styles.pendingOutboxText}>
                ⏳ Ada laporan menunggu sinkronisasi •{" "}
                <Text style={styles.pendingActionUnderline}>Kirim Sekarang</Text>
              </Text>
            </TouchableOpacity>
          ) : syncState === "syncing" ? (
            <Text style={styles.syncingText}>🔄 Menyinkronkan data...</Text>
          ) : syncState === "failed" ? (
            <Text style={styles.failedText}>⚠️ Sinkronisasi gagal, akan dicoba ulang</Text>
          ) : null}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
    flex: 1,
  },
  statusPillOnline: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  statusPillReconnecting: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  statusPillOffline: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pulseDotOnline: {
    backgroundColor: "#16A34A",
  },
  pulseDotReconnecting: {
    backgroundColor: "#D97706",
  },
  pulseDotOffline: {
    backgroundColor: "#DC2626",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  statusTextOnline: {
    color: "#15803D",
  },
  statusTextReconnecting: {
    color: "#B45309",
  },
  statusTextOffline: {
    color: "#B91C1C",
  },
  simPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  simPillOffline: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  simPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  simPillTextOffline: {
    color: "#2563EB",
  },
  syncStateRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  pendingOutboxButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  pendingOutboxText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "500",
  },
  pendingActionUnderline: {
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  syncingText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  failedText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
  },
});
