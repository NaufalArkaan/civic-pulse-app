/**
 * Civic Pulse - Pertemuan 10–13
 * Component: VaultFileList
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
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
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.sectionTitle}>Berkas Tersimpan</Text>
          <Text style={styles.fileCount}>
            {files.length} berkas dalam Scoped Storage (Maks 150 MB/file)
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.smallBtn, isImporting && styles.btnDisabled]}
            onPress={onImportDocument}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel="Impor dokumen dari perangkat"
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.smallBtnText}>+ Dokumen</Text>
            )}
          </TouchableOpacity>

          {onTakePhoto && (
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: "#15803D" }, isImporting && styles.btnDisabled]}
              onPress={onTakePhoto}
              disabled={isImporting}
              accessibilityRole="button"
              accessibilityLabel="Ambil foto langsung dengan kamera"
            >
              <Text style={styles.smallBtnText}>+ Kamera</Text>
            </TouchableOpacity>
          )}

          {onImportImage && (
            <TouchableOpacity
              style={[styles.smallBtnImage, isImporting && styles.btnDisabled]}
              onPress={onImportImage}
              disabled={isImporting}
              accessibilityRole="button"
              accessibilityLabel="Impor foto atau gambar dari galeri"
            >
              <Text style={styles.smallBtnImageText}>+ Galeri</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.smallBtnSecondary, isImporting && styles.btnDisabled]}
            onPress={onCreateDemoReport}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel="Buat dokumen laporan baru"
          >
            <Text style={styles.smallBtnSecondaryText}>+ Buat</Text>
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
    marginTop: 16,
  },
  headerRow: {
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
    marginTop: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
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
  smallBtnImage: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    minHeight: 36,
    justifyContent: "center",
  },
  smallBtnImageText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#166534",
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
    fontWeight: "700",
    color: "#334155",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
