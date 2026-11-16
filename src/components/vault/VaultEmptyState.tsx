/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultEmptyState
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type VaultEmptyStateProps = {
  onImportDocument: () => void;
  onCreateDemoReport: () => void;
  isImporting?: boolean;
};

export const VaultEmptyState = memo(function VaultEmptyState({
  onImportDocument,
  onCreateDemoReport,
  isImporting,
}: VaultEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📂</Text>
      <Text style={styles.title}>Belum Ada Dokumen</Text>
      <Text style={styles.description}>
        Document Vault menyimpan berkas foto kerusakan dan dokumen mitigasi bencana langsung di
        sandbox privat perangkat (Scoped Storage).
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, isImporting && styles.disabledButton]}
          onPress={onImportDocument}
          disabled={isImporting}
        >
          <Text style={styles.primaryButtonText}>
            {isImporting ? "Mengimpor..." : "📁 Pilih Dokumen Perangkat"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isImporting && styles.disabledButton]}
          onPress={onCreateDemoReport}
          disabled={isImporting}
        >
          <Text style={styles.secondaryButtonText}>
            📄 Buat Dokumen Simulasi (Offline)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  buttonContainer: {
    width: "100%",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#208AEF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
