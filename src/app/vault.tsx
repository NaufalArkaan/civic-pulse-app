/**
 * Civic Pulse - Pertemuan 10
 * Screen: Document Vault & Secure Storage Screen
 * Role: Anggota 1 (Lead System Architect) & Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Integrasi Modul P10:
 * - Data Classification & SecureStore: Anggota 1 (Naufal)
 * - UI Document Vault, JIT Permission UX & Performa: Anggota 2 (Syahril)
 * - FileSystem Scoped Storage & JIT Permissions: Anggota 3 (Robi)
 */

import React, { useState, useCallback, useMemo } from "react";
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

import { VaultFile } from "../types/vault";
import { useDocumentVault } from "../hooks/useDocumentVault";
import {
  VaultHeader,
  SecureStoreCard,
  VaultFileList,
  VaultEmptyState,
  VaultPermissionNotice,
  VaultFilePreviewModal,
  VaultJitModal,
} from "../components/vault";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { FeedbackToast } from "../components/common";

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { centeredContainerStyle } = useResponsiveLayout();

  // State untuk Pratinjau Berkas
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);

  // State untuk Just-In-Time (JIT) Runtime Permission & Scoped Storage Modal
  const [isJitModalVisible, setIsJitModalVisible] = useState<boolean>(false);

  // State feedback toast sukses operasi lokal
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Menghitung akumulasi ukuran berkas di sandbox secara ter-memoize
  const totalSizeBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  }, [files]);

  const handleBackToMap = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  /**
   * Menampilkan pratinjau berkas
   */
  const handleOpenFile = useCallback((file: VaultFile) => {
    setSelectedFile(file);
    setIsPreviewVisible(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setSelectedFile(null);
  }, []);

  /**
   * Memicu alur impor berkas dengan edukasi JIT Permission terlebih dahulu
   */
  const handleTriggerImport = useCallback(() => {
    setIsJitModalVisible(true);
  }, []);

  const handleConfirmImport = useCallback(async () => {
    setIsJitModalVisible(false);
    const success = await importDocument();
    if (success) {
      setSuccessMessage("Berkas berhasil disalin ke Scoped Storage privat aplikasi!");
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, [importDocument]);

  const handleCancelImport = useCallback(() => {
    setIsJitModalVisible(false);
  }, []);

  /**
   * Membuat dokumen demonstrasi simulasi secara offline
   */
  const handleCreateDemoReport = useCallback(async () => {
    const timestamp = new Date().toLocaleString("id-ID");
    const demoContent = `[DATA SIMULASI MITIGASI BENCANA - SDG 11]
Waktu Pembuatan: ${timestamp}
Jenis Insiden: Rekahan Talud Tebing Rawan Longsor
Kategori: Laporan Insiden Infrastruktur
Status: Disimpan di Scoped Storage Privat Aplikasi (documentDirectory)
Catatan Keamanan: Berkas ini disimpan di direktori privat tanpa ekspos publik.`;

    const success = await addDemoReport(
      "Laporan_Simulasi_Mitigasi_Bencana",
      demoContent,
      "document"
    );

    if (success) {
      setSuccessMessage("Dokumen simulasi offline berhasil dibuat di sandbox!");
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, [addDemoReport]);

  /**
   * Menghapus dokumen dari vault
   */
  const handleDeleteFile = useCallback(
    async (id: string) => {
      const success = await deleteFile(id);
      if (success) {
        setSuccessMessage("Berkas fisik dan metadata berhasil dihapus dari vault.");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    },
    [deleteFile]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      <View style={[styles.contentWrapper, centeredContainerStyle]}>
        {/* Header Bar dengan Ringkasan Metrik */}
        <VaultHeader
          onBack={handleBackToMap}
          onRefresh={refreshFiles}
          isRefreshing={loading}
          totalFiles={files.length}
          totalSizeBytes={totalSizeBytes}
        />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshFiles}
              tintColor="#208AEF"
              colors={["#208AEF"]}
            />
          }
        >
          {/* Success Feedback Toast */}
          <FeedbackToast
            message={successMessage}
            type="success"
            onDismiss={() => setSuccessMessage(null)}
          />

          {/* Error banner jika ada kegagalan operasi berkas */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Deliverable 1: Integrasi expo-secure-store (Hardware Keystore) */}
          <SecureStoreCard />

          {/* Deliverable 2: Integrasi expo-file-system (Scoped Storage Sandbox) */}
          {files.length === 0 && !loading ? (
            <VaultEmptyState
              onImportDocument={handleTriggerImport}
              onCreateDemoReport={handleCreateDemoReport}
              isImporting={isImporting}
            />
          ) : (
            <VaultFileList
              files={files}
              onOpenFile={handleOpenFile}
              onDeleteFile={handleDeleteFile}
              onImportDocument={handleTriggerImport}
              onCreateDemoReport={handleCreateDemoReport}
              isImporting={isImporting}
            />
          )}

          {/* Deliverable 3: Edukasi Just-In-Time Runtime Permission & Scoped Storage */}
          <VaultPermissionNotice />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Modal Pratinjau Berkas */}
      <VaultFilePreviewModal
        file={selectedFile}
        visible={isPreviewVisible}
        onClose={handleClosePreview}
        onDelete={handleDeleteFile}
      />

      {/* Modal Edukasi Just-In-Time Permission & Scoped Storage */}
      <VaultJitModal
        visible={isJitModalVisible}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        actionType="import"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  contentWrapper: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  successBanner: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  successText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  bannerCloseText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "bold",
    padding: 4,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 36,
  },
});
