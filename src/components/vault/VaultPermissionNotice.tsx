/**
 * Civic Pulse - Pertemuan 10
 * Component: VaultPermissionNotice
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

export const VaultPermissionNotice = memo(function VaultPermissionNotice() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🛡️ Prinsip Privasi & Scoped Storage</Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Just-In-Time (JIT):</Text> Izin hanya diminta saat Anda
        menjalankan aksi yang relevan.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Scoped Storage:</Text> Berkas tersimpan di direktori privat
        aplikasi (`documentDirectory`) dan tidak diekspos ke publik.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Sandbox ≠ Enkripsi Berkas:</Text> Dokumen diisolasi oleh sistem
        operasi, sedangkan data kredensial dienkripsi melalui Keystore.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  heading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  body: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "700",
    color: "#334155",
  },
});
