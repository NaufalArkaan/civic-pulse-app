/**
 * Civic Pulse - Pertemuan 10–13
 * Component: VaultFileList
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Responsiveness & Ergonomics:
 * - Menggunakan 2 baris eksplisit (tanpa flexWrap + flex:1 yang memicu bug tinggi Yoga di React Native)
 *   agar grid tombol 2x2 selalu presisi, simetris, dan tidak pernah menutupi daftar berkas di bawahnya.
 * - Tombol aksi memiliki kontras warna WCAG AA yang tegas dan touch target ergonomis (42 dp).
 */

import React, { memo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
  ListRenderItem,
} from "react-native";
import { VaultFile } from "../../types/vault";
import { VaultFileListProps } from "../../types/components";
import { VaultFileItem } from "./VaultFileItem";

export const VaultFileList = memo(function VaultFileList({
  files,
  onOpenFile,
  onDeleteFile,
  onImportDocument,
  onImportImage,
  onTakePhoto,
  onCreateDemoReport,
  isImporting,
}: VaultFileListProps) {
  const renderItem: ListRenderItem<VaultFile> = useCallback(
    ({ item }) => (
      <VaultFileItem
        item={item}
        onOpen={onOpenFile}
        onDelete={onDeleteFile}
      />
    ),
    [onOpenFile, onDeleteFile]
  );

  const keyExtractor = useCallback((item: VaultFile) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Stacked Header Card: Title Row + Explicit 2x2 Action Grid */}
      <View style={styles.headerCard}>
        <View style={styles.titleRow}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.sectionTitle}>Berkas Tersimpan di Brankas</Text>
            <Text style={styles.fileCount}>
              Penyimpanan Scoped Storage Terisolasi (Maks 150 MB / berkas)
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText} numberOfLines={1}>
              {files.length} Berkas
            </Text>
          </View>
        </View>

        {/* Baris 1: Kamera & Galeri */}
        <View style={styles.actionRow}>
          {onTakePhoto && (
            <TouchableOpacity
              style={[styles.actionBtnBase, styles.cameraBtn, isImporting && styles.btnDisabled]}
              onPress={onTakePhoto}
              disabled={isImporting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ambil foto langsung dengan kamera"
            >
              <Text style={styles.cameraBtnText} numberOfLines={1}>
                📸 + Kamera
              </Text>
            </TouchableOpacity>
          )}

          {onImportImage && (
            <TouchableOpacity
              style={[styles.actionBtnBase, styles.galleryBtn, isImporting && styles.btnDisabled]}
              onPress={onImportImage}
              disabled={isImporting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Impor foto atau gambar dari galeri"
            >
              <Text style={styles.galleryBtnText} numberOfLines={1}>
                🖼️ + Galeri
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Baris 2: Dokumen PDF & Buat Baru */}
        <View style={[styles.actionRow, styles.actionRowSecond]}>
          <TouchableOpacity
            style={[styles.actionBtnBase, styles.docBtn, isImporting && styles.btnDisabled]}
            onPress={onImportDocument}
            disabled={isImporting}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Impor dokumen PDF dari perangkat"
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#1D4ED8" />
            ) : (
              <Text style={styles.docBtnText} numberOfLines={1}>
                📄 + Dokumen
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnBase, styles.createBtn, isImporting && styles.btnDisabled]}
            onPress={onCreateDemoReport}
            disabled={isImporting}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Buat dokumen laporan baru"
          >
            <Text style={styles.createBtnText} numberOfLines={1}>
              ✍️ + Buat Baru
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={files}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  headerTitleBox: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  fileCount: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 15,
  },
  countBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionRowSecond: {
    marginTop: 8,
  },
  actionBtnBase: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    backgroundColor: "#15803D",
    borderColor: "#166534",
  },
  cameraBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  galleryBtn: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  galleryBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#047857",
  },
  docBtn: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  docBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  createBtn: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  createBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#334155",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
