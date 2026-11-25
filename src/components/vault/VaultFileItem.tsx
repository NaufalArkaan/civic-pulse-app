/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultFileItem
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Performance, Ergonomics & Accessibility:
 * - Menggunakan `React.memo` untuk mencegah rerender saat item lain dalam list berubah.
 * - Area sentuh memenuhi standar aksesibilitas minimum (touch target >= 44 dp).
 * - Mendukung preview tap via `onOpen(file)`.
 * - Konfirmasi penghapusan eksplisit dengan peringatan yang jelas sebelum menghapus.
 */

import React, { memo } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { VaultFileItemProps } from "../../types/components";
import { AnimatedPressable } from "../common/AnimatedPressable";

export const VaultFileItem = memo(
  function VaultFileItem({ item, onOpen, onDelete }: VaultFileItemProps) {
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
        "Hapus Berkas dari Vault",
        `Apakah Anda yakin ingin menghapus "${item.displayName}" dari Document Vault lokal? Berkas fisik akan dihapus dari penyimpanan privat.`,
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

    const a11yLabel = `Berkas ${item.displayName}, kategori ${
      item.category === "photo" ? "Foto" : "Dokumen"
    }, ukuran ${formattedSize}, tanggal ${formattedDate}.${
      item.isMissing ? " Peringatan: Berkas fisik hilang." : ""
    }`;

    return (
      <AnimatedPressable
        style={[styles.container, item.isMissing && styles.containerMissing]}
        onPress={() => onOpen(item)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Ketuk untuk melihat rincian dan pratinjau dokumen"
      >
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

        {/* Delete Action Button */}
        <AnimatedPressable
          style={styles.deleteButton}
          onPress={handleDeletePress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`Hapus berkas ${item.displayName}`}
          accessibilityHint="Menghapus berkas fisik dan metadata dari Document Vault"
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </AnimatedPressable>
      </AnimatedPressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.displayName === nextProps.item.displayName &&
      prevProps.item.sizeBytes === nextProps.item.sizeBytes &&
      prevProps.item.isMissing === nextProps.item.isMissing
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 64,
  },
  containerMissing: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  infoBox: {
    flex: 1,
  },
  fileName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  metaDot: {
    marginHorizontal: 5,
    color: "#94A3B8",
    fontSize: 10,
  },
  badgeRow: {
    flexDirection: "row",
  },
  sandboxBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  sandboxBadgeText: {
    color: "#166534",
    fontSize: 9.5,
    fontWeight: "700",
  },
  missingBadge: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  missingBadgeText: {
    color: "#991B1B",
    fontSize: 9.5,
    fontWeight: "700",
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginLeft: 4,
  },
  deleteButtonText: {
    fontSize: 18,
  },
});
