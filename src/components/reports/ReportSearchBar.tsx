/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportSearchBar
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View, Text } from "react-native";

type ReportSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  loading?: boolean;
};

export const ReportSearchBar = memo(function ReportSearchBar({
  value,
  onChangeText,
  loading,
}: ReportSearchBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        placeholder="Cari laporan kerusakan, longsor, banjir..."
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {loading ? (
        <Text style={styles.loadingDot}>⏳</Text>
      ) : value ? (
        <TouchableOpacity onPress={() => onChangeText("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
  },
  loadingDot: {
    fontSize: 12,
  },
  clearText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
});
