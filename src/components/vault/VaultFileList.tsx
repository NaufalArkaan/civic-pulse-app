/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultFileList
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Performance Safeguards:
 * - Menggunakan `FlatList` virtualized rendering untuk efisiensi memori ketika jumlah dokumen bertambah banyak.
 * - Key stabil berbasis ID unik berkas (`item.id`).
 * - Memoized `renderItem` untuk mencegah instansiasi fungsi baru pada setiap render.
 * - Desain header list informatif dengan tombol aksi penambahan berkas.
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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Berkas Tersimpan</Text>
          <Text style={styles.fileCount}>
            {files.length} dokumen dalam Scoped Storage
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.smallBtn, isImporting && styles.btnDisabled]}
            onPress={onImportDocument}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel="Impor berkas dari perangkat"
            accessibilityHint="Membuka pemilih berkas sistem untuk menyalin dokumen ke vault"
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#208AEF" />
            ) : (
              <Text style={styles.smallBtnText}>+ Impor File</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtnSecondary, isImporting && styles.btnDisabled]}
            onPress={onCreateDemoReport}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel="Buat dokumen laporan simulasi offline"
            accessibilityHint="Membuat berkas teks laporan mitigasi bencana simulasi di sandbox"
          >
            <Text style={styles.smallBtnSecondaryText}>+ Simulasi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Virtualized FlatList for High Performance */}
      <FlatList
        data={files}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false} // Dikontrol oleh parent ScrollView
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
    marginTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  fileCount: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  smallBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    minHeight: 36,
    justifyContent: "center",
  },
  smallBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1E40AF",
  },
  smallBtnSecondary: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    minHeight: 36,
    justifyContent: "center",
  },
  smallBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
