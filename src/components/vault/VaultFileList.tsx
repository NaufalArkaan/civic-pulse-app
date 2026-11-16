/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultFileList
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { VaultFile } from "../../types/vault";
import { VaultFileItem } from "./VaultFileItem";

type VaultFileListProps = {
  files: VaultFile[];
  onDeleteFile: (id: string) => void;
  onImportDocument: () => void;
  onCreateDemoReport: () => void;
  isImporting?: boolean;
};

export const VaultFileList = memo(function VaultFileList({
  files,
  onDeleteFile,
  onImportDocument,
  onCreateDemoReport,
  isImporting,
}: VaultFileListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Berkas Tersimpan</Text>
          <Text style={styles.fileCount}>{files.length} dokumen di sandbox</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.smallBtn, isImporting && styles.btnDisabled]}
            onPress={onImportDocument}
            disabled={isImporting}
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
          >
            <Text style={styles.smallBtnSecondaryText}>+ Simulasi</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.list}>
        {files.map((file) => (
          <VaultFileItem
            key={file.id}
            item={file}
            onDelete={onDeleteFile}
          />
        ))}
      </View>
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
    fontWeight: "700",
    color: "#0F172A",
  },
  fileCount: {
    fontSize: 11,
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    gap: 6,
  },
  smallBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  smallBtnSecondary: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  smallBtnSecondaryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  list: {
    marginTop: 4,
  },
});
