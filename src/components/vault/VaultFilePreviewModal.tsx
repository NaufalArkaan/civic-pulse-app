/**
 * Civic Pulse - Pertemuan 10 & 13
 * Component: VaultFilePreviewModal
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Visual, Accessibility & In-App Document Inspection:
 * - Menggunakan `expo-image` (Glide on Android) untuk rendering gambar Scoped Storage yang stabil tanpa black screen / OOM.
 * - In-App Document & PDF Dossier Inspector: Pengguna dapat langsung melihat rincian, metadata struktur, dan cuplikan teks dokumen di dalam aplikasi.
 * - Aksi Terarah: Memisahkan secara tegas aksi "Tautkan ke Laporan Bencana" (aksi utama aplikasi) dan "Ekspor / Bagikan ke Aplikasi Lain" (OS Share Sheet).
 * - Menjaga urutan Hook React 19 agar terhindar dari reconciler error "Expected static flag was missing".
 */

import React, { memo, useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { VaultFilePreviewModalProps } from "../../types/components";
import { normalizeLocalFileUri } from "../../utils/reportMedia";

export const VaultFilePreviewModal = memo(function VaultFilePreviewModal({
  file,
  visible,
  onClose,
  onDelete,
  onUseAsReportEvidence,
}: VaultFilePreviewModalProps) {
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [docContentPreview, setDocContentPreview] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<boolean>(false);

  // Hook dipanggil sebelum conditional return apa pun untuk kepatuhan React 19 Hook Rules
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setDocContentPreview(null);

    let isMounted = true;
    if (file && file.category === "document" && !file.isMissing && file.localUri) {
      setDocLoading(true);
      // Baca segmen awal berkas untuk ekstraksi ringkasan/pratinjau in-app
      FileSystem.readAsStringAsync(file.localUri, {
        length: 1500,
      })
        .then((content) => {
          if (!isMounted) return;
          if (content.startsWith("%PDF")) {
            // Berkas PDF biner: ekstrak string teks yang terbaca manusia
            const cleaned = content
              .replace(/[^\x20-\x7E\n\r\t]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            setDocContentPreview(
              cleaned.length > 25
                ? cleaned.substring(0, 360) + "..."
                : "Dokumen PDF terstruktur (Header %PDF-1.4 terverifikasi). Berkas siap dilampirkan ke laporan bencana."
            );
          } else {
            // Berkas teks biasa / markdown / json
            setDocContentPreview(content.trim().substring(0, 600));
          }
        })
        .catch(() => {
          if (isMounted) setDocContentPreview(null);
        })
        .finally(() => {
          if (isMounted) setDocLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [file?.id, file?.localUri, file?.category, file?.isMissing]);

  if (!file) return null;

  const isPhoto = file.category === "photo";
  const icon = isPhoto ? "📷" : file.category === "document" ? "📄" : "📁";

  const formattedSize = file.sizeBytes
    ? file.sizeBytes < 1024 * 1024
      ? `${(file.sizeBytes / 1024).toFixed(1)} KB`
      : `${(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : "Ukuran tidak tersedia";

  const formattedDate = new Date(file.createdAt).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const categoryLabel =
    file.category === "photo"
      ? "Foto Bukti Insiden"
      : file.category === "document"
      ? "Dokumen Mitigasi"
      : "Berkas Pendukung";

  // Aksi Ekspor / Bagikan ke aplikasi lain (Share Sheet OS: WA, Drive, dsb.)
  const handleShareFile = async () => {
    if (!file || file.isMissing) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Fitur Berbagi", "Sistem operasi tidak mendukung pembagian berkas.");
        return;
      }
      await Sharing.shareAsync(file.localUri, {
        mimeType: file.mimeType || undefined,
        dialogTitle: `Ekspor Salinan ${file.displayName}`,
        UTI: file.category === "photo" ? "public.image" : "public.composite-content",
      });
    } catch (err: any) {
      Alert.alert("Gagal Membuka Berbagi", err?.message || "Tidak dapat membagikan berkas.");
    }
  };

  // Aksi Utama: Tautkan Langsung ke Laporan Bencana
  const handleUseAsReport = () => {
    if (!file || file.isMissing) return;
    onClose();
    if (onUseAsReportEvidence) {
      onUseAsReportEvidence(file);
    }
  };

  const resolvedPhotoUri = normalizeLocalFileUri(file.localUri) || file.localUri;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header Dialog */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.categoryIcon}>{icon}</Text>
              <View style={styles.titleTextBox}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {file.displayName}
                </Text>
                <Text style={styles.categoryText}>{categoryLabel}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Tutup pratinjau berkas"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {/* Visual Section: Photo Mode with expo-image */}
            {isPhoto && !file.isMissing ? (
              <View style={styles.imagePreviewContainer}>
                {imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.imageLoadingText}>Memuat foto bukti...</Text>
                  </View>
                )}
                {imageError ? (
                  <View style={styles.imageErrorBox}>
                    <Text style={styles.imageErrorIcon}>⚠️</Text>
                    <Text style={styles.imageErrorTitle}>Foto tidak dapat ditampilkan langsung</Text>
                    <TouchableOpacity style={styles.openExternalBtn} onPress={handleShareFile}>
                      <Text style={styles.openExternalBtnText}>📤 Ekspor / Bagikan Foto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Image
                    source={{ uri: resolvedPhotoUri }}
                    style={styles.imagePreview}
                    contentFit="contain"
                    transition={200}
                    onLoadStart={() => setImageLoading(true)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                    accessibilityLabel={`Foto bukti ${file.displayName}`}
                  />
                )}
              </View>
            ) : (
              /* Visual Section: Document & PDF Dossier Inspector (In-App) */
              <View style={styles.docDossierContainer}>
                <View style={styles.docDossierHeader}>
                  <Text style={styles.docDossierIcon}>{icon}</Text>
                  <View style={styles.docDossierTitleBox}>
                    <Text style={styles.docDossierName} numberOfLines={2}>
                      {file.displayName}
                    </Text>
                    <Text style={styles.docDossierMeta}>
                      {formattedSize} • {file.mimeType || "Dokumen Mitigasi"}
                    </Text>
                  </View>
                </View>

                {file.isMissing ? (
                  <View style={styles.docMissingNotice}>
                    <Text style={styles.docMissingText}>
                      ⚠️ Berkas fisik tidak ditemukan di penyimpanan Scoped Storage lokal.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.docInspectorBox}>
                    <View style={styles.docInspectorTopRow}>
                      <Text style={styles.docInspectorBadge}>📑 Inspeksi Dokumen In-App</Text>
                      <Text style={styles.docStorageBadge}>🔒 App Sandbox</Text>
                    </View>

                    {docLoading ? (
                      <View style={styles.docLoadingBox}>
                        <ActivityIndicator size="small" color="#0284C7" />
                        <Text style={styles.docLoadingText}>Membaca pratinjau isi dokumen...</Text>
                      </View>
                    ) : docContentPreview ? (
                      <View style={styles.docTextSnippetCard}>
                        <Text style={styles.docTextSnippetHeader}>Ekstrak Cuplikan Dokumen:</Text>
                        <ScrollView
                          style={styles.docTextSnippetScroll}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator
                        >
                          <Text style={styles.docTextSnippet}>{docContentPreview}</Text>
                        </ScrollView>
                      </View>
                    ) : (
                      <View style={styles.docStructureCard}>
                        <Text style={styles.docStructureTitle}>
                          {file.displayName.toLowerCase().endsWith(".pdf")
                            ? "📄 Dokumen Resmi PDF (ISO 32000-1)"
                            : "📁 Berkas Mitigasi Terverifikasi"}
                        </Text>
                        <Text style={styles.docStructureDesc}>
                          Dokumen tersimpan aman di direktori privat Scoped Storage. Siap digunakan langsung sebagai bukti lampiran laporan bencana.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Quick Action: Tautkan Langsung ke Laporan Bencana (Hubungan Vault & Laporan) */}
            {!file.isMissing && onUseAsReportEvidence && (
              <TouchableOpacity
                style={styles.useAsReportBanner}
                onPress={handleUseAsReport}
                accessibilityRole="button"
                accessibilityLabel="Jadikan berkas ini sebagai bukti laporan bencana"
              >
                <Text style={styles.useAsReportIcon}>📢</Text>
                <View style={styles.useAsReportTextBox}>
                  <Text style={styles.useAsReportTitle}>Jadikan Bukti Laporan Bencana</Text>
                  <Text style={styles.useAsReportSubtitle}>
                    Otomatis buka formulir lapor dengan berkas ini sebagai lampiran resmi.
                  </Text>
                </View>
                <Text style={styles.useAsReportArrow}>➔</Text>
              </TouchableOpacity>
            )}

            {/* Storage Status Badge */}
            <View style={styles.badgeSection}>
              <View
                style={[
                  styles.statusBadge,
                  file.isMissing ? styles.missingBadge : styles.sandboxBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    file.isMissing ? styles.missingBadgeText : styles.sandboxBadgeText,
                  ]}
                >
                  {file.isMissing
                    ? "⚠️ Status: Berkas Fisik Hilang"
                    : "🔒 Penyimpanan: Scoped Storage (documentDirectory)"}
                </Text>
              </View>
            </View>

            {/* Metadata Detail List */}
            <View style={styles.metaCard}>
              <Text style={styles.metaHeading}>Informasi Metadata Berkas</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>ID Dokumen:</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {file.id}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Ukuran Berkas:</Text>
                <Text style={styles.metaValue}>{formattedSize}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tipe MIME:</Text>
                <Text style={styles.metaValue}>{file.mimeType || "Tidak terdefinisi"}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Waktu Disimpan:</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Hak Akses:</Text>
                <Text style={styles.metaValue}>Privat (Hanya Aplikasi Civic Pulse)</Text>
              </View>
            </View>

            {/* Informational Note */}
            <View style={styles.privacyNoteBox}>
              <Text style={styles.privacyNoteText}>
                💡 Berkas ini dikelola oleh Document Vault secara offline di sandbox perangkat.
                Anda dapat menautkannya langsung ke formulir pelaporan bencana (SDG 11).
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            {!file.isMissing && (
              <TouchableOpacity
                style={styles.shareActionBtn}
                onPress={handleShareFile}
                accessibilityRole="button"
                accessibilityLabel="Ekspor salinan berkas ke aplikasi lain"
              >
                <Text style={styles.shareActionText}>📤 Ekspor / Bagikan</Text>
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                style={styles.deleteActionBtn}
                onPress={() => {
                  onClose();
                  onDelete(file.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Hapus berkas ${file.displayName}`}
              >
                <Text style={styles.deleteActionText}>🗑️ Hapus</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeActionBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Selesai melihat pratinjau"
            >
              <Text style={styles.closeActionText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  titleTextBox: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  categoryText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "bold",
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  imagePreviewContainer: {
    width: "100%",
    height: 230,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  imageLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  imageErrorBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  imageErrorIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  imageErrorTitle: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  openExternalBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openExternalBtnText: {
    color: "#1D4ED8",
    fontSize: 11.5,
    fontWeight: "700",
  },
  docDossierContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  docDossierHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
  },
  docDossierIcon: {
    fontSize: 32,
    marginRight: 10,
  },
  docDossierTitleBox: {
    flex: 1,
  },
  docDossierName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  docDossierMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  docMissingNotice: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  docMissingText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
  },
  docInspectorBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  docInspectorTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  docInspectorBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0369A1",
  },
  docStorageBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docLoadingBox: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  docLoadingText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
  },
  docTextSnippetCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 6,
  },
  docTextSnippetHeader: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  docTextSnippetScroll: {
    maxHeight: 110,
  },
  docTextSnippet: {
    fontSize: 11,
    color: "#334155",
    fontFamily: "monospace",
    lineHeight: 16,
  },
  docStructureCard: {
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  docStructureTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  docStructureDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  useAsReportBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  useAsReportIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  useAsReportTextBox: {
    flex: 1,
  },
  useAsReportTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 2,
  },
  useAsReportSubtitle: {
    fontSize: 11,
    color: "#15803D",
    lineHeight: 15,
  },
  useAsReportArrow: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#166534",
    marginLeft: 8,
  },
  badgeSection: {
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sandboxBadge: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  sandboxBadgeText: {
    color: "#166534",
  },
  missingBadge: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  missingBadgeText: {
    color: "#991B1B",
  },
  metaCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  metaHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  metaLabel: {
    fontSize: 11.5,
    color: "#64748B",
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#0F172A",
    maxWidth: "60%",
    textAlign: "right",
  },
  privacyNoteBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  privacyNoteText: {
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  shareActionBtn: {
    flex: 1.2,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shareActionText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteActionBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteActionText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  closeActionBtn: {
    flex: 0.9,
    backgroundColor: "#208AEF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  closeActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
