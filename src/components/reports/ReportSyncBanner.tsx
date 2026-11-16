/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportSyncBanner
 * Role: Anggota 2 (Syahril) UI Baseline & Anggota 1 Security/Integration
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NetworkState, SyncState } from "../../types/sync";
import { networkService } from "../../services/network/networkService";

type ReportSyncBannerProps = {
  networkState: NetworkState;
  syncState: SyncState;
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
      {/* Network and Sync Status Row */}
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
              ? "Online (Realtime Aktif)"
              : isReconnecting
              ? "Menyambung Ulang..."
              : "Offline (Mode Cache)"}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.simButton, !isOnline && styles.simButtonOffline]}
            onPress={handleToggleNetworkSimulation}
          >
            <Text style={styles.simButtonText}>
              {isOnline ? "Simulasikan Offline" : "Simulasikan Online"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync State & Realtime Trigger Bar */}
      <View style={styles.syncRow}>
        <View style={styles.syncInfo}>
          <Text style={styles.providerLabel}>
            Stream: Mock Realtime (WebSocket Simulation)
          </Text>
          {syncState === "pending" && (
            <TouchableOpacity onPress={onProcessOutbox}>
              <Text style={styles.outboxPendingText}>
                ⏳ Ada antrean outbox • Tekan untuk kirim
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.emitEventButton} onPress={onSimulateRealtime}>
          <Text style={styles.emitEventButtonText}>⚡ Kirim Event Live</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  leftStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
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
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  rightActions: {
    flexDirection: "row",
  },
  simButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simButtonOffline: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  simButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B91C1C",
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  syncInfo: {
    flex: 1,
  },
  providerLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  outboxPendingText: {
    fontSize: 10,
    color: "#D97706",
    fontWeight: "700",
    marginTop: 2,
  },
  emitEventButton: {
    backgroundColor: "#208AEF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emitEventButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
