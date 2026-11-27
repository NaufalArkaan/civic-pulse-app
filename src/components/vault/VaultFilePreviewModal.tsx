/**
 * Civic Pulse - Pertemuan 10 & 13
 * Component: VaultFilePreviewModal
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Visual, Accessibility & In-App Document Inspection:
 * - Menggunakan `CivicImage` (Base64 Scoped Storage resolver) agar foto kamera/galeri selalu tampil tajam tanpa error path Expo Go.
 * - Interactive In-App Document Reader: Pengguna dapat memperluas layar baca dokumen di dalam modal tanpa terpotong.
 * - Fail-Safe Sharing: Menggunakan `safeShareDocumentOrMediaAsync` via cacheDirectory agar tidak pernah terkena error "Not allowed to read file under given URL".
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
import { VaultFilePreviewModalProps } from "../../types/components";
import {
  readDocumentPreviewTextAsync,
  safeShareDocumentOrMediaAsync,
} from "../../utils/reportMedia";
import { CivicImage } from "../common/CivicImage";

export const VaultFilePreviewModal = memo(function VaultFilePreviewModal({
  file,
  visible,
  onClose,
  onDelete,
  onUseAsReportEvidence,
}: VaultFilePreviewModalProps) {
  const [docContentPreview, setDocContentPreview] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<boolean>(false);
  const [isReaderExpanded, setIsReaderExpanded] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Hook dipanggil sebelum conditional return apa pun untuk kepatuhan React 19 Hook Rules
  useEffect(() => {
    setDocContentPreview(null);
    setIsReaderExpanded(false);

    let isMounted = true;
    if (file && file.category !== "photo" && !file.isMissing && file.localUri) {
      setDocLoading(true);
      readDocumentPreviewTextAsync(file.localUri, {
        title: file.displayName,
        createdAt: file.createdAt,
      })
        .then((res) => {
          if (isMounted) {
            setDocContentPreview(res.content);
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
  }, [file?.id, file?.localUri, file?.category, file?.isMissing, file?.displayName, file?.createdAt]);

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

  // Aksi Ekspor / Bagikan ke aplikasi lain secara fail-safe melalui cacheDirectory
  const handleShareFile = async () => {
    if (!file || file.isMissing || isSharing) return;
    setIsSharing(true);
    try {
      const res = await safeShareDocumentOrMediaAsync({
        uri: file.localUri,
        displayName: file.displayName,
        mimeType: file.mimeType,
        fallbackTitle: file.displayName,
      });
      if (!res.success && res.error) {
        Alert.alert("Info Ekspor Berkas", res.error);
      }
    } finally {
      setIsSharing(false);
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
                <Text style={styles.categoryText}>
                  {categoryLabel} • {formattedSize}
                </Text>
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

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {/* Visual Section: Photo Mode with CivicImage Base64 Resolver */}
            {isPhoto && !file.isMissing ? (
              <View style={styles.imagePreviewContainer}>
                <CivicImage
                  uri={file.localUri}
                  fallbackUri={null}
                  contentFit="contain"
                  style={styles.imagePreview}
                  label={file.displayName}
                  accessibilityLabel={`Foto bukti ${file.displayName}`}
                />
                <View style={styles.photoVerifiedBadge}>
                  <Text style={styles.photoVerifiedText}>
                    🔒 Terverifikasi di Scoped Storage • {formattedSize}
                  </Text>
                </View>
              </View>
            ) : (
              /* Visual Section: Interactive In-App Document & PDF Reader */
              <View style={styles.docDossierContainer}>
                <View style={styles.docDossierHeader}>
                  <Text style={styles.docDossierIcon}>{icon}</Text>
                  <View style={styles.docDossierTitleBox}>
                    <Text style={styles.docDossierName} numberOfLines={2}>
                      {file.displayName}
                    </Text>
                    <Text style={styles.docDossierMeta}>
                      {formattedSize} • {file.mimeType || "application/pdf"}
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
                      <Text style={styles.docInspectorBadge}>📖 Pembaca Dokumen In-App</Text>
                      <TouchableOpacity
                        style={styles.expandReaderBtn}
                        onPress={() => setIsReaderExpanded((prev) => !prev)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.expandReaderBtnText}>
                          {isReaderExpanded ? "🔽 Ringkas" : "🔍 Perluas Bacaan"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {docLoading ? (
                      <View style={styles.docLoadingBox}>
                        <ActivityIndicator size="small" color="#0284C7" />
                        <Text style={styles.docLoadingText}>Membaca isi dokumen...</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.docTextSnippetCard,
                          isReaderExpanded && styles.docTextSnippetCardExpanded,
                        ]}
                      >
                        <Text style={styles.docTextSnippet}>
                          {docContentPreview ||
                            `DOKUMEN RESMI PDF (ISO 32000-1)\nNama Berkas: ${file.displayName}\nUkuran: ${formattedSize}\nStatus: Tersimpan utuh di Scoped Storage perangkat dan siap ditautkan ke laporan bencana.`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Quick Action: Tautkan Langsung ke Laporan Bencana */}
            {!file.isMissing && onUseAsReportEvidence && (
              <TouchableOpacity
                style={styles.useAsReportBanner}
                onPress={handleUseAsReport}
                activeOpacity={0.8}
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

            {/* Metadata Detail List */}
            <View style={styles.metaCard}>
              <Text style={styles.metaHeading}>Informasi Metadata & Keamanan Sandbox</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>ID Dokumen:</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {file.id}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Ukuran & Tipe:</Text>
                <Text style={styles.metaValue}>
                  {formattedSize} ({file.mimeType || "application/octet-stream"})
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Waktu Disimpan:</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Isolasi Berkas:</Text>
                <Text style={styles.metaValueSuccess}>🔒 Scoped Storage (App Sandbox)</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            {!file.isMissing && (
              <TouchableOpacity
                style={styles.shareActionBtn}
                onPress={handleShareFile}
                disabled={isSharing}
                accessibilityRole="button"
                accessibilityLabel="Ekspor salinan berkas ke aplikasi lain"
              >
                <Text style={styles.shareActionText}>
                  {isSharing ? "Menyiapkan..." : "📤 Ekspor / Bagikan"}
                </Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 22,
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
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  categoryText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
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
    paddingTop: 14,
    paddingBottom: 16,
  },
  imagePreviewContainer: {
    width: "100%",
    height: 250,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  photoVerifiedBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  photoVerifiedText: {
    color: "#F8FAFC",
    fontSize: 10.5,
    fontWeight: "700",
  },
  docDossierContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
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
    fontSize: 30,
    marginRight: 10,
  },
  docDossierTitleBox: {
    flex: 1,
  },
  docDossierName: {
    fontSize: 13.5,
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
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0369A1",
  },
  expandReaderBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expandReaderBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1D4ED8",
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
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  docTextSnippetCardExpanded: {
    backgroundColor: "#FFFFFF",
    borderColor: "#93C5FD",
  },
  docTextSnippet: {
    fontSize: 11.5,
    color: "#1E293B",
    lineHeight: 18,
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
  metaCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
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
    maxWidth: "62%",
    textAlign: "right",
  },
  metaValueSuccess: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#166534",
    maxWidth: "65%",
    textAlign: "right",
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
    flex: 0.9,
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
