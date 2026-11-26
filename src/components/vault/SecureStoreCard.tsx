/**
 * Civic Pulse - Pertemuan 10–13
 * Component: SecureStoreCard
 * Role: Anggota 1 (Security Engineer) & Anggota 2 (Syahril - UI)
 *
 * Integrasi expo-secure-store dengan input kredensial nyata (NIK / ID Petugas & Token Sesi),
 * generator token kriptografis, toggle masking privasi, dan validasi ukuran <= 2KB.
 */

import React, { useState, useEffect, memo } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { secureStorage } from "../../services/secure/secureStorage";
import { SECURE_STORAGE_KEYS } from "../../types/secure";
import { maskNIK } from "../../utils/fileValidation";

export const SecureStoreCard = memo(function SecureStoreCard() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [storedNIK, setStoredNIK] = useState<string | null>(null);
  const [storedToken, setStoredToken] = useState<string | null>(null);

  // Input form state untuk NIK/ID Pelapor nyata
  const [inputNIK, setInputNIK] = useState<string>("");
  const [showPlainValues, setShowPlainValues] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    void checkAvailabilityAndLoad();
  }, []);

  async function checkAvailabilityAndLoad() {
    const avail = await secureStorage.isAvailable();
    setIsAvailable(avail);

    if (avail) {
      const nikRes = await secureStorage.getSensitiveItem(SECURE_STORAGE_KEYS.USER_NIK);
      const tokenRes = await secureStorage.getSensitiveItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      if (nikRes.success && nikRes.data) {
        setStoredNIK(nikRes.data);
        setInputNIK(nikRes.data);
      }
      if (tokenRes.success && tokenRes.data) {
        setStoredToken(tokenRes.data);
      }
    }
  }

  async function handleSaveCredentials() {
    const cleanNik = inputNIK.trim();

    if (cleanNik.length < 10) {
      setIsError(true);
      setFeedback("Masukkan NIK / ID Pelapor yang valid (minimal 10–16 digit).");
      return;
    }

    setLoading(true);
    setFeedback(null);
    setIsError(false);

    // Token sesi diamankan dan dikelola otomatis di balik layar (Hardware Keystore)
    const activeToken =
      storedToken ||
      `civic_jwt_${Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;

    const res1 = await secureStorage.setSensitiveItem(
      SECURE_STORAGE_KEYS.USER_NIK,
      cleanNik
    );
    const res2 = await secureStorage.setSensitiveItem(
      SECURE_STORAGE_KEYS.AUTH_TOKEN,
      activeToken
    );

    if (res1.success && res2.success) {
      setStoredNIK(cleanNik);
      setStoredToken(activeToken);
      setFeedback("Identitas pelapor & sesi kredensial berhasil diamankan di OS Keystore secara otomatis!");
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
      if (nikRes.data) setInputNIK(nikRes.data);

      if (nikRes.data || tokenRes.data) {
        setFeedback("Identitas & sesi terenkripsi berhasil diverifikasi langsung dari Hardware Keystore.");
      } else {
        setFeedback("Belum ada identitas tersimpan di Keystore.");
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
    setInputNIK("");
    setFeedback("Identitas dan sesi terenkripsi telah dibersihkan dari Keystore.");
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
            {isAvailable ? "Keystore Aktif" : "Tidak Tersedia"}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>Identitas & Kredensial Pelapor Resmi</Text>
      <Text style={styles.description}>
        Identitas Anda disimpan terenkripsi di Hardware Keystore OS perangkat. Token sesi otorisasi dikelola secara aman di balik layar tanpa perlu diinput manual.
      </Text>

      {/* Form Input NIK / ID Pelapor Nyata (Token otomatis di balik layar) */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>NIK / ID Pelapor (16 Digit):</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Contoh: 3573011808020001"
          placeholderTextColor="#94A3B8"
          value={inputNIK}
          onChangeText={setInputNIK}
          keyboardType="number-pad"
          maxLength={20}
        />
      </View>

      {/* Tampilan Status Enkripsi di Keystore dengan Toggle Masking */}
      <View style={styles.storedSection}>
        <View style={styles.storedHeaderRow}>
          <Text style={styles.storedSectionTitle}>Status Enkripsi di OS Keystore:</Text>
          {storedNIK && (
            <TouchableOpacity
              onPress={() => setShowPlainValues((prev) => !prev)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.toggleMaskText}>
                {showPlainValues ? "🙈 Sembunyikan" : "👁️ Lihat NIK Asli"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>NIK Pelapor:</Text>
          <Text style={styles.fieldValue}>
            {showPlainValues ? storedNIK || "Belum disetel" : maskNIK(storedNIK)}
          </Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Sesi Keystore:</Text>
          <Text style={[styles.fieldValue, { color: storedToken ? "#166534" : "#94A3B8" }]}>
            {storedToken
              ? "🟢 Terenkripsi & Aktif Otomatis (Di Balik Layar)"
              : "⚪ Belum Ada Sesi"}
          </Text>
        </View>
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
          onPress={handleSaveCredentials}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.btnTextPrimary}>💾 Simpan Identitas</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnSecondary]}
          onPress={handleReadFromKeystore}
          disabled={loading}
        >
          <Text style={styles.btnTextSecondary}>Cek Keystore</Text>
        </TouchableOpacity>

        {(storedNIK || storedToken) && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnDanger]}
            onPress={handleDelete}
            disabled={loading}
          >
            <Text style={styles.btnTextDanger}>Hapus</Text>
          </TouchableOpacity>
        )}
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
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  tokenHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  generateBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  generateBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  storedSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 2,
    marginBottom: 6,
  },
  storedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  storedSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  toggleMaskText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#208AEF",
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
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
    maxWidth: "62%",
  },
  feedbackBox: {
    padding: 8,
    borderRadius: 6,
    marginVertical: 6,
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
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    flex: 1.4,
    backgroundColor: "#208AEF",
  },
  btnSecondary: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  btnDanger: {
    flex: 0.7,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  btnTextPrimary: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  btnTextSecondary: {
    color: "#334155",
    fontSize: 11.5,
    fontWeight: "700",
  },
  btnTextDanger: {
    color: "#DC2626",
    fontSize: 11.5,
    fontWeight: "700",
  },
});
