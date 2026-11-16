/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultFilePreviewModal
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Visual, Accessibility & Privacy Safeguards:
 * - Menampilkan pratinjau berkas (foto/dokumen/lainnya) dan metadata Scoped Storage.
 * - Tidak mengekspos URI internal mentah (/data/user/0/...) ke pengguna; nama file dan sandbox status ditonjolkan.
 * - Mendukung aksesibilitas TalkBack/VoiceOver dengan modal role dan touch target >= 44 dp.
 * - Murni presentasional (tidak memanggil native FileSystem langsung di komponen UI).
 */

import React, { memo } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
} from "react-native";
import { VaultFilePreviewModalProps } from "../../types/components";

export const VaultFilePreviewModal = memo(function VaultFilePreviewModal({
  file,
  visible,
  onClose,
  onDelete,
}: VaultFilePreviewModalProps) {
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
          {/* Header */}
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
            {/* Visual Preview Section */}
            {isPhoto && !file.isMissing ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: file.localUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                  accessibilityLabel={`Foto bukti ${file.displayName}`}
                />
              </View>
            ) : (
              <View style={styles.docPreviewPlaceholder}>
                <Text style={styles.docPlaceholderIcon}>{icon}</Text>
                <Text style={styles.docPlaceholderTitle}>{file.displayName}</Text>
                <Text style={styles.docPlaceholderSubtitle}>
                  {file.isMissing
                    ? "⚠️ Berkas fisik tidak ditemukan di penyimpanan privat."
                    : "Tersimpan aman di direktori privat aplikasi (App Sandbox)."}
                </Text>
              </View>
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
              <Text style={styles.metaHeading}>Informasi Metadata</Text>

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
                <Text style={styles.metaLabel}>Tipe Konten:</Text>
                <Text style={styles.metaValue}>{file.mimeType || "Tidak terdefinisi"}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Waktu Disimpan:</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Aksesibilitas:</Text>
                <Text style={styles.metaValue}>Privat (Hanya Aplikasi Civic Pulse)</Text>
              </View>
            </View>

            {/* Informational Privacy Notice */}
            <View style={styles.privacyNoteBox}>
              <Text style={styles.privacyNoteText}>
                💡 Berkas ini dikelola oleh Document Vault secara offline di sandbox perangkat.
                Tidak ada data media yang diunggah ke cloud tanpa persetujuan Anda.
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
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
                <Text style={styles.deleteActionText}>🗑️ Hapus Dokumen</Text>
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
    maxHeight: "85%",
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
    height: 200,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    marginBottom: 16,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  docPreviewPlaceholder: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  docPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  docPlaceholderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  docPlaceholderSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
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
    gap: 10,
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
    flex: 1,
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
