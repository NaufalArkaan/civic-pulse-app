/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportSearchBar
 * Role: Anggota 2 (Lead Frontend & Reactive UI Specialist)
 *
 * Reactive Input Safeguards:
 * - Menjaga kestabilan fokus kursor saat list laporan diperbarui oleh stream RxJS.
 * - Tombol clear input instan dengan target sentuh memadai (hitSlop & min height).
 * - Counter jumlah laporan terfilter untuk visibilitas hasil secara transparan.
 * - Loading feedback terintegrasi tanpa mengganggu interaksi pengetikan pengguna.
 */

import React, { memo, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { AnimatedPressable } from "../common/AnimatedPressable";

type ReportSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  loading?: boolean;
  resultCount?: number;
};

export const ReportSearchBar = memo(function ReportSearchBar({
  value,
  onChangeText,
  loading,
  resultCount,
}: ReportSearchBarProps) {
  // Local state untuk respon pengetikan instan (<16ms 60 FPS) tanpa lag kontrol parent
  const [localText, setLocalText] = useState(value);

  // Sinkronisasi dengan external prop value ketika di-reset dari luar (contoh: Reset Filter atau Clear)
  useEffect(() => {
    setLocalText(value);
  }, [value]);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalText(text);
      onChangeText(text);
    },
    [onChangeText]
  );

  const handleClear = useCallback(() => {
    setLocalText("");
    onChangeText("");
  }, [onChangeText]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputContainer} accessibilityRole="search">
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Cari laporan kerusakan, longsor, banjir..."
          placeholderTextColor="#94A3B8"
          value={localText}
          onChangeText={handleChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel="Kolom pencarian laporan infrastruktur"
          accessibilityHint="Ketik kata kunci; pencarian reaktif diproses otomatis setelah 300 milidetik jeda"
        />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#208AEF" />
          </View>
        ) : localText.length > 0 ? (
          <AnimatedPressable
            style={styles.clearBtn}
            onPress={handleClear}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Hapus kata kunci pencarian"
          >
            <Text style={styles.clearText}>✕</Text>
          </AnimatedPressable>
        ) : null}
      </View>

      {/* Result Metrics Pill */}
      {resultCount !== undefined && (
        <View style={styles.metaRow}>
          <Text style={styles.resultCountText}>
            Menampilkan <Text style={styles.bold}>{resultCount}</Text> laporan terverifikasi
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 44,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
    fontWeight: "500",
  },
  loadingBox: {
    paddingHorizontal: 4,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "bold",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  resultCountText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  bold: {
    fontWeight: "800",
    color: "#0F172A",
  },
});
