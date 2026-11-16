/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultJitModal
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * UX Just-In-Time (JIT) Runtime Permission & Scoped Storage Explainer:
 * - Menjelaskan transparansi akses perangkat sebelum sistem picker dibuka.
 * - Menegaskan prinsip Zero Broad Storage Permissions (Scoped Storage).
 * - Menangani dialog konfirmasi ramah pengguna sebelum mengakses pemilih file sistem.
 */

import React, { memo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VaultJitModalProps } from "../../types/components";

export const VaultJitModal = memo(function VaultJitModal({
  visible,
  onConfirm,
  onCancel,
  actionType = "import",
}: VaultJitModalProps) {
  const icon = actionType === "camera" ? "📸" : "📁";
  const title =
    actionType === "camera"
      ? "Izin Akses Kamera (Just-In-Time)"
      : "Akses Berkas Mandiri (Scoped Storage)";

  const explanation =
    actionType === "camera"
      ? "Civic Pulse memerlukan akses kamera hanya saat Anda mengambil foto bukti infrastruktur. Izin tidak dipicu di latar belakang dan dapat diubah kapan saja melalui Pengaturan Perangkat."
      : "Civic Pulse menggunakan System Document Picker. Aplikasi TIDAK meminta izin membaca seluruh penyimpanan ponsel Anda (No Broad Storage Permission). Hanya berkas yang Anda pilih yang akan disalin ke sandbox privat aplikasi.";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={styles.dialogCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{icon}</Text>
          </View>

          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogDescription}>{explanation}</Text>

          {/* Privacy Points */}
          <View style={styles.bulletBox}>
            <Text style={styles.bulletItem}>
              ✅ <Text style={styles.bulletBold}>Privasi Terjamin:</Text> Berkas tersimpan di sandbox
              lokal.
            </Text>
            <Text style={styles.bulletItem}>
              ✅ <Text style={styles.bulletBold}>Zero Data Leak:</Text> Tidak ada media diunggah tanpa
              izin.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionColumn}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="Lanjutkan membuka pemilih berkas sistem"
            >
              <Text style={styles.confirmBtnText}>Lanjutkan ke Pemilih Berkas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Batal memilih berkas"
            >
              <Text style={styles.cancelBtnText}>Batal</Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  icon: {
    fontSize: 26,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 12.5,
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  bulletBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  bulletItem: {
    fontSize: 11.5,
    color: "#334155",
    lineHeight: 16,
  },
  bulletBold: {
    fontWeight: "700",
  },
  actionColumn: {
    width: "100%",
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: "#208AEF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelBtn: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "600",
  },
});
