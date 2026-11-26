/**
 * Civic Pulse - Pertemuan 10–13
 * Screen: Document Vault & Secure Storage Screen
 * Role: Anggota 1 (Lead System Architect) & Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Fitur Utama:
 * - Input & penyimpanan kredensial nyata di Hardware-Backed Keystore (expo-secure-store).
 * - Impor berkas nyata berkapasitas besar (hingga 150 MB) dari perangkat (Scoped Storage).
 * - Pembuatan Dokumen & Paket Bukti Lapangan kustom dengan pilihan kapasitas ukuran MB nyata.
 */

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    SecureStoreCard,
    VaultEmptyState,
    VaultFileList,
    VaultFilePreviewModal,
    VaultHeader,
    VaultJitModal,
    VaultPermissionNotice,
} from "../components/vault";
import { useDocumentVault } from "../hooks/useDocumentVault";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { VaultFile, VaultFileCategory } from "../types/vault";

const SIZE_PRESETS_MB = [
  { label: "1.8 MB (PDF Standar)", value: 1.8 },
  { label: "4.5 MB (Foto High-Res)", value: 4.5 },
  { label: "12.4 MB (Paket Geospasial)", value: 12.4 },
  { label: "28.5 MB (Arsip Bukti Lengkap)", value: 28.5 },
];

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { centeredContainerStyle } = useResponsiveLayout();

  // State untuk Pratinjau Berkas
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);

  // State untuk Just-In-Time (JIT) Runtime Permission & Scoped Storage Modal
  const [isJitModalVisible, setIsJitModalVisible] = useState<boolean>(false);

  // State untuk Modal Pembuatan Dokumen & Bukti Baru (Input Real Data & Ukuran MB)
  const [isCreateModalVisible, setIsCreateModalVisible] =
    useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>(
    "Laporan_Inspeksi_Infrastruktur_Malang",
  );
  const [docNotes, setDocNotes] = useState<string>(
    "Hasil pemeriksaan teknis kerusakan struktur jalan dan drainase oleh tim lapangan.",
  );
  const [docCategory, setDocCategory] = useState<VaultFileCategory>("document");
  const [docSizeMb, setDocSizeMb] = useState<number>(4.5);

  // State feedback toast sukses operasi lokal dengan lifecycle timer cleanup
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTimedSuccessToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setSuccessMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setSuccessMessage(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const {
    files,
    loading,
    error,
    isImporting,
    refreshFiles,
    importDocument,
    importImage,
    takeCameraPhoto,
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

  const handleOpenFile = useCallback((file: VaultFile) => {
    setSelectedFile(file);
    setIsPreviewVisible(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setSelectedFile(null);
  }, []);

  const [jitActionType, setJitActionType] = useState<"import" | "gallery" | "camera">("import");

  const handleTriggerImport = useCallback(() => {
    setJitActionType("import");
    setIsJitModalVisible(true);
  }, []);

  const handleTriggerImportImage = useCallback(() => {
    setJitActionType("gallery");
    setIsJitModalVisible(true);
  }, []);

  const handleTriggerTakePhoto = useCallback(() => {
    setJitActionType("camera");
    setIsJitModalVisible(true);
  }, []);

  const handleConfirmImport = useCallback(async () => {
    setIsJitModalVisible(false);
    let success = false;
    if (jitActionType === "camera") {
      success = await takeCameraPhoto();
    } else if (jitActionType === "gallery") {
      success = await importImage();
    } else {
      success = await importDocument();
    }
    if (success) {
      showTimedSuccessToast(
        "Berkas berhasil diamankan di Scoped Storage privat!",
      );
    }
  }, [jitActionType, importDocument, importImage, takeCameraPhoto, showTimedSuccessToast]);

  const handleCancelImport = useCallback(() => {
    setIsJitModalVisible(false);
  }, []);

  /**
   * Membuka modal pembuatan dokumen laporan nyata dengan pilihan ukuran MB
   */
  const handleOpenCreateModal = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const handleSubmitCreateDocument = useCallback(async () => {
    const cleanTitle = docTitle.trim() || `Dokumen_Bukti_${Date.now()}`;
    const timestamp = new Date().toLocaleString("id-ID");
    const structuredContent = `DOKUMEN BUKTI LAPANGAN CIVIC PULSE (SDG 11)
Judul Dokumen: ${cleanTitle}
Waktu Pencatatan: ${timestamp}
Kategori Berkas: ${docCategory === "photo" ? "Lampiran Foto Resolusi Tinggi" : "Dokumen Laporan Mitigasi (PDF)"}
Kapasitas Paket Data: ${docSizeMb.toFixed(2)} MB
Catatan Teknis Lapangan:
${docNotes.trim() || "-"}`;

    setIsCreateModalVisible(false);
    const success = await addDemoReport(
      cleanTitle,
      structuredContent,
      docCategory,
      docSizeMb,
    );

    if (success) {
      showTimedSuccessToast(
        `Dokumen "${cleanTitle}" (${docSizeMb.toFixed(2)} MB) berhasil disimpan di Vault!`,
      );
    }
  }, [
    docTitle,
    docNotes,
    docCategory,
    docSizeMb,
    addDemoReport,
    showTimedSuccessToast,
  ]);

  const handleDeleteFile = useCallback(
    async (id: string) => {
      const success = await deleteFile(id);
      if (success) {
        showTimedSuccessToast(
          "Berkas fisik dan metadata berhasil dihapus dari vault.",
        );
      }
    },
    [deleteFile, showTimedSuccessToast],
  );

  const handleUseAsReportEvidence = useCallback(
    (file: VaultFile) => {
      setIsPreviewVisible(false);
      router.push({
        pathname: "/reports",
        params: {
          createWithVaultUri: file.localUri,
          createWithVaultName: file.displayName,
          createWithVaultCategory: file.category,
        },
      } as any);
    },
    [router],
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar style="light" />

      <View style={[styles.contentWrapper, centeredContainerStyle]}>
        {/* Header Bar dengan Ringkasan Metrik (KB / MB) */}
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
          keyboardShouldPersistTaps="handled"
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
          {successMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ {successMessage}</Text>
              <TouchableOpacity onPress={() => setSuccessMessage(null)}>
                <Text style={styles.bannerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error banner jika ada kegagalan operasi berkas */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Deliverable 1: Integrasi expo-secure-store (Input Kredensial Nyata) */}
          <SecureStoreCard />

          {/* Alur Kerja Produksi: Hubungan Nyata Document Vault & Laporan Mitigasi */}
          <View style={styles.workflowCard}>
            <View style={styles.workflowHeader}>
              <View style={styles.workflowIconCircle}>
                <Text style={styles.workflowIcon}>🛡️</Text>
              </View>
              <View style={styles.workflowTitleBox}>
                <Text style={styles.workflowTitle}>
                  Alur Bukti Lapangan & Mitigasi
                </Text>
                <Text style={styles.workflowSubtitle}>
                  Standar Sistem Tanggap Bencana & Infrastruktur (SDG 11)
                </Text>
              </View>
            </View>

            <View style={styles.workflowSteps}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Brankas Dokumen:</Text> Berkas
                  bukti fisik asli berukuran besar (foto resolusi tinggi,
                  dokumen PDF inspeksi hingga 150 MB) disimpan secara terisolasi
                  di Scoped Storage lokal.
                </Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Laporan & Mitigasi:</Text> Saat
                  mengajukan laporan publik, Anda dapat menautkan berkas bukti
                  dari Brankas ini sebagai lampiran resmi.
                </Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Tindak Lanjut:</Text> Petugas
                  memverifikasi laporan bersama lampiran bukti, mengeksekusi
                  perbaikan lapangan, hingga status selesai.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.ctaReportBtn}
              onPress={() => router.push("/reports")}
              accessibilityRole="button"
              accessibilityLabel="Buka menu Laporan dan Mitigasi"
            >
              <Text style={styles.ctaReportBtnText}>
                🚀 Buka Menu Laporan & Tautkan Bukti Vault
              </Text>
            </TouchableOpacity>
          </View>

          {/* Deliverable 2: Integrasi expo-file-system (Scoped Storage Sandbox Hingga 150 MB) */}
          {files.length === 0 && !loading ? (
            <VaultEmptyState
              onImportDocument={handleTriggerImport}
              onImportImage={handleTriggerImportImage}
              onTakePhoto={handleTriggerTakePhoto}
              onCreateDemoReport={handleOpenCreateModal}
              isImporting={isImporting}
            />
          ) : (
            <VaultFileList
              files={files}
              onOpenFile={handleOpenFile}
              onDeleteFile={handleDeleteFile}
              onImportDocument={handleTriggerImport}
              onImportImage={handleTriggerImportImage}
              onTakePhoto={handleTriggerTakePhoto}
              onCreateDemoReport={handleOpenCreateModal}
              isImporting={isImporting}
            />
          )}

          {/* Deliverable 3: Edukasi Just-In-Time Runtime Permission & Scoped Storage */}
          <VaultPermissionNotice />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Modal Pratinjau Berkas */}
      {selectedFile && (
        <VaultFilePreviewModal
          file={selectedFile}
          visible={isPreviewVisible}
          onClose={handleClosePreview}
          onDelete={handleDeleteFile}
          onUseAsReportEvidence={handleUseAsReportEvidence}
        />
      )}

      {/* Modal Edukasi Just-In-Time Permission & Scoped Storage */}
      <VaultJitModal
        visible={isJitModalVisible}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        actionType={jitActionType}
      />

      {/* Modal Form Buat Dokumen & Paket Bukti Baru (Input Real Data & Ukuran MB) */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📝 Buat Dokumen & Bukti Baru
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.fieldLabel}>Nama / Judul Dokumen:</Text>
              <TextInput
                style={styles.textInput}
                value={docTitle}
                onChangeText={setDocTitle}
                placeholder="Contoh: Bukti_Banjir_Soekarno_Hatta"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Kategori Berkas:</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[
                    styles.choicePill,
                    docCategory === "document" && styles.choicePillActive,
                  ]}
                  onPress={() => setDocCategory("document")}
                >
                  <Text
                    style={[
                      styles.choicePillText,
                      docCategory === "document" && styles.choicePillTextActive,
                    ]}
                  >
                    📄 Dokumen PDF
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.choicePill,
                    docCategory === "photo" && styles.choicePillActive,
                  ]}
                  onPress={() => setDocCategory("photo")}
                >
                  <Text
                    style={[
                      styles.choicePillText,
                      docCategory === "photo" && styles.choicePillTextActive,
                    ]}
                  >
                    📷 Foto Bukti High-Res
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Ukuran Paket Berkas (MB):</Text>
              <View style={styles.sizeGrid}>
                {SIZE_PRESETS_MB.map((preset) => {
                  const active = docSizeMb === preset.value;
                  return (
                    <TouchableOpacity
                      key={preset.value}
                      style={[styles.sizeChip, active && styles.sizeChipActive]}
                      onPress={() => setDocSizeMb(preset.value)}
                    >
                      <Text
                        style={[
                          styles.sizeChipText,
                          active && styles.sizeChipTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>
                Catatan / Isi Laporan Bukti:
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={docNotes}
                onChangeText={setDocNotes}
                multiline
                numberOfLines={3}
                placeholder="Masukkan rincian lokasi, kondisi kerusakan, dan tindakan..."
                placeholderTextColor="#94A3B8"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsCreateModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleSubmitCreateDocument}
              >
                <Text style={styles.submitModalBtnText}>
                  💾 Simpan ({docSizeMb.toFixed(1)} MB)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  successText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  bannerCloseText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "bold",
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
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    width: "100%",
    maxWidth: 440,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748B",
  },
  modalBody: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "500",
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  choicePill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  choicePillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#208AEF",
  },
  choicePillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  choicePillTextActive: {
    color: "#1D4ED8",
  },
  sizeGrid: {
    gap: 6,
    marginBottom: 6,
  },
  sizeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  sizeChipActive: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  sizeChipTextActive: {
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
  },
  cancelModalBtn: {
    flex: 0.8,
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalBtnText: {
    color: "#475569",
    fontSize: 12.5,
    fontWeight: "700",
  },
  submitModalBtn: {
    flex: 1.4,
    backgroundColor: "#208AEF",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitModalBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  workflowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  workflowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  workflowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  workflowIcon: {
    fontSize: 18,
  },
  workflowTitleBox: {
    flex: 1,
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  workflowSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  workflowSteps: {
    gap: 10,
    marginBottom: 14,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  stepDesc: {
    flex: 1,
    fontSize: 11.5,
    color: "#334155",
    lineHeight: 17,
  },
  stepBold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  ctaReportBtn: {
    backgroundColor: "#208AEF",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaReportBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
});
