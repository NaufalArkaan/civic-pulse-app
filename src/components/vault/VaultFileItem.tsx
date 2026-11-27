/**
 * Civic Pulse - Pertemuan 10–13
 * Component: VaultFileItem
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Performance, Ergonomics & Accessibility:
 * - Menggunakan `React.memo` untuk mencegah rerender saat item lain dalam list berubah.
 * - Menggunakan `CivicImage` (Base64 Scoped Storage resolver) agar thumbnail foto lokal selalu tampil tajam.
 * - Badge dilengkapi `numberOfLines={1}` dan `flexShrink: 0` agar teks tidak pernah terpotong pada Android.
 */

import React, { memo } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { VaultFileItemProps } from "../../types/components";
import { AnimatedPressable } from "../common/AnimatedPressable";
import { CivicImage } from "../common/CivicImage";

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
          {item.category === "photo" && !item.isMissing ? (
            <CivicImage
              uri={item.localUri}
              fallbackUri={null}
              compact
              style={styles.thumbnailImage}
              accessibilityLabel={`Thumbnail ${item.displayName}`}
            />
          ) : (
            <Text style={styles.iconText}>{icon}</Text>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.displayName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {formattedSize} • {formattedDate}
            </Text>
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
                numberOfLines={1}
              >
                {item.isMissing ? "⚠️ Fisik Hilang" : "🔒 Sandbox\u00A0Privat"}
              </Text>
            </View>
            {!item.isMissing && (
              <View style={styles.previewHintBadge}>
                <Text style={styles.previewHintText} numberOfLines={1}>
                  {item.category === "photo" ? "👁️ Lihat\u00A0Foto" : "📖 Baca\u00A0PDF"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Delete Action Button */}
        <AnimatedPressable
          style={styles.deleteButton}
          onPress={handleDeletePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
      prevProps.item.isMissing === nextProps.item.isMissing &&
      prevProps.item.localUri === nextProps.item.localUri
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 72,
  },
  containerMissing: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  thumbnailImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  iconText: {
    fontSize: 24,
  },
  infoBox: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  sandboxBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexShrink: 0,
  },
  sandboxBadgeText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "700",
  },
  previewHintBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexShrink: 0,
  },
  previewHintText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "700",
  },
  missingBadge: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  missingBadgeText: {
    color: "#991B1B",
    fontSize: 10,
    fontWeight: "700",
  },
  deleteButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexShrink: 0,
  },
  deleteButtonText: {
    fontSize: 16,
  },
});
