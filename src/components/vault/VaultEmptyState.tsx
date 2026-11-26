/**
 * Civic Pulse - Pertemuan 10–13
 * Component: VaultEmptyState
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VaultEmptyStateProps } from "../../types/components";

export const VaultEmptyState = memo(function VaultEmptyState({
  onImportDocument,
  onImportImage,
  onTakePhoto,
  onCreateDemoReport,
  isImporting,
}: VaultEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>📂</Text>
      </View>
      <Text style={styles.title}>Belum Ada Dokumen di Vault</Text>
      <Text style={styles.description}>
        Document Vault menyimpan berkas bukti berkapasitas besar (Foto High-Res, PDF, Video, ZIP hingga
        150 MB) di direktori privat perangkat (Scoped Storage).
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, isImporting && styles.disabledButton]}
          onPress={onImportDocument}
          disabled={isImporting}
          accessibilityRole="button"
          accessibilityLabel="Impor berkas dokumen dari perangkat"
        >
          <Text style={styles.primaryButtonText}>
            {isImporting ? "Sedang Memproses..." : "📁 Impor Dokumen (PDF, ZIP, dll)"}
          </Text>
        </TouchableOpacity>

        {onTakePhoto && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: "#15803D" }, isImporting && styles.disabledButton]}
            onPress={onTakePhoto}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel="Ambil foto bukti langsung menggunakan kamera"
          >
            <Text style={styles.primaryButtonText}>
              {isImporting ? "Sedang Memproses..." : "📸 Ambil Foto Kamera Langsung"}
            </Text>
          </TouchableOpacity>
        )}

        {onImportImage && (
          <TouchableOpacity
            style={[styles.imageButton, isImporting && styles.disabledButton]}
            onPress={onImportImage}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel="Impor foto atau gambar dari galeri"
          >
            <Text style={styles.imageButtonText}>
              🖼️ Impor Foto dari Galeri
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.secondaryButton, isImporting && styles.disabledButton]}
          onPress={onCreateDemoReport}
          disabled={isImporting}
          accessibilityRole="button"
          accessibilityLabel="Buat dokumen laporan dan paket bukti baru"
        >
          <Text style={styles.secondaryButtonText}>
            📝 + Buat Dokumen & Paket Bukti Baru (MB)
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#208AEF",
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  imageButton: {
    backgroundColor: "#EFF6FF",
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingHorizontal: 16,
  },
  imageButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#F8FAFC",
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 12.5,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
