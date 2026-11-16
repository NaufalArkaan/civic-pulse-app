/**
 * Civic Pulse - Pertemuan 10
 * Screen: Document Vault & Secure Storage Screen
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 *
 * Integrasi Modul P10:
 * - Data Classification & SecureStore: Anggota 1 (Naufal)
 * - UI Document Vault & Feedback: Anggota 2 (Syahril)
 * - FileSystem Scoped Storage & JIT Permissions: Anggota 3 (Robi)
 */

import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Text,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useDocumentVault } from "../hooks/useDocumentVault";
import {
  VaultHeader,
  SecureStoreCard,
  VaultFileList,
  VaultEmptyState,
  VaultPermissionNotice,
} from "../components/vault";

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    files,
    loading,
    error,
    isImporting,
    refreshFiles,
    importDocument,
    addDemoReport,
    deleteFile,
  } = useDocumentVault();

  const handleBackToMap = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const handleCreateDemoReport = useCallback(async () => {
    const timestamp = new Date().toLocaleString("id-ID");
    const demoContent = `[DATA SIMULASI MITIGASI BENCANA - SDG 11]
Waktu Pembuatan: ${timestamp}
Jenis Insiden: Rekahan Talud Tebing Rawan Longsor
Kategori: Laporan Insiden Infrastruktur
Status: Disimpan di Scoped Storage Privat Aplikasi
Catatan Keamanan: Berkas ini disimpan di documentDirectory tanpa ekspos publik.`;

    await addDemoReport("Laporan_Simulasi_Mitigasi_Bencana", demoContent, "document");
  }, [addDemoReport]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Header Bar */}
      <VaultHeader
        onBack={handleBackToMap}
        onRefresh={refreshFiles}
        isRefreshing={loading}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshFiles} tintColor="#208AEF" />
        }
      >
        {/* Error banner jika ada kegagalan operasi berkas */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* 1. Deliverable 1: Integrasi expo-secure-store */}
        <SecureStoreCard />

        {/* 2. Deliverable 2: Integrasi expo-file-system (Scoped Storage Sandbox) */}
        {files.length === 0 && !loading ? (
          <VaultEmptyState
            onImportDocument={importDocument}
            onCreateDemoReport={handleCreateDemoReport}
            isImporting={isImporting}
          />
        ) : (
          <VaultFileList
            files={files}
            onDeleteFile={deleteFile}
            onImportDocument={importDocument}
            onCreateDemoReport={handleCreateDemoReport}
            isImporting={isImporting}
          />
        )}

        {/* 3. Deliverable 3: Edukasi Runtime Permission & Scoped Storage */}
        <VaultPermissionNotice />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 32,
  },
});
