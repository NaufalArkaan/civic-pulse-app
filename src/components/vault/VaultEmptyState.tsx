/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultEmptyState
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Visual & Empty State Presentation:
 * - Menjelaskan kepada pengguna bahwa belum ada dokumen yang disimpan di sandbox privat.
 * - Menyediakan tombol aksi utama untuk mengimpor berkas atau membuat dokumen simulasi offline.
 * - Touch target ramah aksesibilitas (>= 44 dp).
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VaultEmptyStateProps } from "../../types/components";

export const VaultEmptyState = memo(function VaultEmptyState({
  onImportDocument,
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
        Document Vault menyimpan foto bukti insiden dan laporan mitigasi bencana langsung di
        sandbox privat perangkat (Scoped Storage). Data tidak diunggah ke cloud.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, isImporting && styles.disabledButton]}
          onPress={onImportDocument}
          disabled={isImporting}
          accessibilityRole="button"
          accessibilityLabel="Pilih dokumen dari perangkat"
          accessibilityHint="Membuka pemilih berkas sistem untuk menyalin dokumen ke sandbox privat"
        >
          <Text style={styles.primaryButtonText}>
            {isImporting ? "Sedang Mengimpor..." : "📁 Pilih Dokumen Perangkat"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isImporting && styles.disabledButton]}
          onPress={onCreateDemoReport}
          disabled={isImporting}
          accessibilityRole="button"
          accessibilityLabel="Buat dokumen simulasi mitigasi bencana offline"
          accessibilityHint="Membuat berkas teks demonstrasi langsung di sandbox aplikasi tanpa koneksi internet"
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
