/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultHeader
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type VaultHeaderProps = {
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export const VaultHeader = memo(function VaultHeader({
  onBack,
  onRefresh,
  isRefreshing,
}: VaultHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke peta insiden"
          >
            <Text style={styles.backButtonText}>← Peta</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Document Vault</Text>
          <Text style={styles.subtitle}>Scoped Storage & Keystore (SDG 11)</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity
            style={[styles.refreshButton, isRefreshing && styles.refreshing]}
            onPress={onRefresh}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#334155",
    borderRadius: 8,
    marginRight: 10,
  },
  backButtonText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "700",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshing: {
    opacity: 0.5,
  },
  refreshButtonText: {
    fontSize: 16,
  },
});
