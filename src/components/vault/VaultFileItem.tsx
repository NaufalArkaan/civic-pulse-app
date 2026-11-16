/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultFileItem
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { VaultFile } from "../../types/vault";

type VaultFileItemProps = {
  item: VaultFile;
  onDelete: (id: string) => void;
};

export const VaultFileItem = memo(function VaultFileItem({
  item,
  onDelete,
}: VaultFileItemProps) {
  const icon =
    item.category === "photo" ? "📷" : item.category === "document" ? "📄" : "📁";

  const formattedSize = item.sizeBytes
    ? item.sizeBytes < 1024 * 1024
      ? `${(item.sizeBytes / 1024).toFixed(1)} KB`
      : `${(item.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : "-";

  const formattedDate = new Date(item.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleDeletePress() {
    Alert.alert(
      "Hapus Berkas",
      `Apakah Anda yakin ingin menghapus "${item.displayName}" dari Document Vault?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => onDelete(item.id),
        },
      ]
    );
  }

  return (
    <View style={[styles.container, item.isMissing && styles.containerMissing]}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.displayName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formattedSize}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{formattedDate}</Text>
        </View>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.sandboxBadge,
              item.isMissing && styles.missingBadge,
            ]}
          >
            <Text
              style={[
                styles.sandboxBadgeText,
                item.isMissing && styles.missingBadgeText,
              ]}
            >
              {item.isMissing ? "⚠️ Berkas Fisik Hilang" : "App Sandbox (Private)"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeletePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Hapus berkas"
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  containerMissing: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  infoBox: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
  },
  metaDot: {
    marginHorizontal: 4,
    color: "#94A3B8",
    fontSize: 10,
  },
  badgeRow: {
    flexDirection: "row",
  },
  sandboxBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  sandboxBadgeText: {
    color: "#166534",
    fontSize: 9,
    fontWeight: "700",
  },
  missingBadge: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  missingBadgeText: {
    color: "#991B1B",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 6,
  },
  deleteButtonText: {
    fontSize: 16,
  },
});
