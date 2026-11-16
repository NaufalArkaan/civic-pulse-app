/**
 * Civic Pulse - Pertemuan 10
 * Component: SecureStoreCard
 * Role: Anggota 1 (Security Engineer) & Anggota 2 (Syahril) UI
 *
 * Demonstrasi resmi integrasi expo-secure-store untuk kredensial/token/NIK dummy
 * dengan masking data sensitif dan penanganan error/null.
 */

import React, { useState, useEffect, memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { secureStorage } from "../../services/secure/secureStorage";
import { SECURE_STORAGE_KEYS } from "../../types/secure";
import { maskNIK, maskToken } from "../../utils/fileValidation";

// Data dummy simulasi (bukan data pribadi/anggota nyata)
const DUMMY_NIK_SIMULATION = "3573031204010001";
const DUMMY_TOKEN_SIMULATION = "civic_tok_e91b2c3d4e5f6a7b";

export const SecureStoreCard = memo(function SecureStoreCard() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [storedNIK, setStoredNIK] = useState<string | null>(null);
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    checkAvailabilityAndLoad();
  }, []);

  async function checkAvailabilityAndLoad() {
    const avail = await secureStorage.isAvailable();
    setIsAvailable(avail);

    if (avail) {
      const nikRes = await secureStorage.getSensitiveItem(SECURE_STORAGE_KEYS.USER_NIK);
      const tokenRes = await secureStorage.getSensitiveItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      if (nikRes.success) setStoredNIK(nikRes.data);
      if (tokenRes.success) setStoredToken(tokenRes.data);
    }
  }

  async function handleSaveDummy() {
    setLoading(true);
    setFeedback(null);
    setIsError(false);

    const res1 = await secureStorage.setSensitiveItem(
      SECURE_STORAGE_KEYS.USER_NIK,
      DUMMY_NIK_SIMULATION
    );
    const res2 = await secureStorage.setSensitiveItem(
      SECURE_STORAGE_KEYS.AUTH_TOKEN,
      DUMMY_TOKEN_SIMULATION
    );

    if (res1.success && res2.success) {
      setStoredNIK(DUMMY_NIK_SIMULATION);
      setStoredToken(DUMMY_TOKEN_SIMULATION);
      setFeedback("Kredensial simulasi berhasil disimpan ke OS Keystore/Keychain!");
    } else {
      setIsError(true);
      setFeedback(res1.error || res2.error || "Gagal menyimpan ke SecureStore.");
    }
    setLoading(false);
  }

  async function handleReadFromKeystore() {
    setLoading(true);
    setFeedback(null);
    setIsError(false);

    const nikRes = await secureStorage.getSensitiveItem(SECURE_STORAGE_KEYS.USER_NIK);
    const tokenRes = await secureStorage.getSensitiveItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);

    if (nikRes.success && tokenRes.success) {
      setStoredNIK(nikRes.data);
      setStoredToken(tokenRes.data);
      if (nikRes.data || tokenRes.data) {
        setFeedback("Data berhasil dibaca dari SecureStore (Hardware-Backed Keystore).");
      } else {
        setFeedback("Tidak ada kredensial tersimpan di SecureStore (null).");
      }
    } else {
      setIsError(true);
      setFeedback(nikRes.error || tokenRes.error || "Gagal membaca SecureStore.");
    }
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    setFeedback(null);
    setIsError(false);

    await secureStorage.deleteSensitiveItem(SECURE_STORAGE_KEYS.USER_NIK);
    await secureStorage.deleteSensitiveItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);

    setStoredNIK(null);
    setStoredToken(null);
    setFeedback("Kredensial sensitif telah dihapus dari SecureStore.");
    setLoading(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={styles.secureBadge}>
          <Text style={styles.secureBadgeText}>🔐 EXPO-SECURE-STORE</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            isAvailable ? styles.statusPillActive : styles.statusPillInactive,
          ]}
        >
          <Text style={styles.statusPillText}>
            {isAvailable ? "Keystore Siap" : "Tidak Tersedia"}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>Penyimpanan Kredensial Sensitif</Text>
      <Text style={styles.description}>
        Data sensitif (Token & NIK) disimpan terenkripsi di Keystore/Keychain tanpa plain JSON,
        AsyncStorage, atau file log.
      </Text>

      {/* Tampilan Data dengan Masking Keamanan */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>NIK Terenkripsi:</Text>
        <Text style={styles.fieldValue}>{maskNIK(storedNIK)}</Text>
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Auth Token:</Text>
        <Text style={styles.fieldValue}>{maskToken(storedToken)}</Text>
      </View>

      {/* Feedback status */}
      {feedback && (
        <View style={[styles.feedbackBox, isError ? styles.feedbackError : styles.feedbackSuccess]}>
          <Text style={[styles.feedbackText, isError ? styles.textError : styles.textSuccess]}>
            {feedback}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnPrimary]}
          onPress={handleSaveDummy}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.btnTextPrimary}>Simpan Dummy</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnSecondary]}
          onPress={handleReadFromKeystore}
          disabled={loading}
        >
          <Text style={styles.btnTextSecondary}>Baca Keystore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnDanger]}
          onPress={handleDelete}
          disabled={loading}
        >
          <Text style={styles.btnTextDanger}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  secureBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  secureBadgeText: {
    color: "#1E40AF",
    fontSize: 10,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: "#DCFCE7",
  },
  statusPillInactive: {
    backgroundColor: "#FEE2E2",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "monospace",
  },
  feedbackBox: {
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
  },
  feedbackSuccess: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  feedbackError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  feedbackText: {
    fontSize: 11,
    lineHeight: 15,
  },
  textSuccess: {
    color: "#166534",
  },
  textError: {
    color: "#991B1B",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#208AEF",
  },
  btnTextPrimary: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  btnSecondary: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  btnTextSecondary: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "600",
  },
  btnDanger: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  btnTextDanger: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "600",
  },
});
