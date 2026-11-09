/**
 * Civic Pulse - Modul LBS
 * Component: MapControls
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MapControlsProps } from "../../types/components";
import { TrackingMode } from "../../types/location";
import { TRACKING_CONFIG } from "../../constants/tracking";

const MODES: TrackingMode[] = ["low", "balanced", "high"];

export const MapControls = memo(function MapControls({
  mode,
  onModeChange,
  onRecenter,
  isRecenterDisabled,
}: MapControlsProps) {
  return (
    <View style={styles.controlsContainer}>
      {/* Mode Selector Pill */}
      <View style={styles.modeContainer}>
        <Text style={styles.modeHeading}>Interval GPS:</Text>
        <View style={styles.pillRow}>
          {MODES.map((m) => {
            const isActive = m === mode;
            const config = TRACKING_CONFIG[m];
            return (
              <TouchableOpacity
                key={m}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => onModeChange(m)}
                accessibilityRole="button"
                accessibilityLabel={config.label}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {m === "low" ? "50m" : m === "balanced" ? "20m" : "5m"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Recenter Button ("Lokasi Saya") */}
      <TouchableOpacity
        style={[styles.recenterButton, isRecenterDisabled && styles.recenterDisabled]}
        onPress={onRecenter}
        disabled={isRecenterDisabled}
        accessibilityRole="button"
        accessibilityLabel="Pusatkan ke lokasi saya"
      >
        <Text style={styles.recenterIcon}>🎯</Text>
        <Text style={[styles.recenterText, isRecenterDisabled && styles.recenterTextDisabled]}>
          Lokasi Saya
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  controlsContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    left: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  modeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  modeHeading: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginRight: 6,
  },
  pillRow: {
    flexDirection: "row",
    gap: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  pillActive: {
    backgroundColor: "#208AEF",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  recenterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  recenterDisabled: {
    opacity: 0.6,
    backgroundColor: "#F8FAFC",
  },
  recenterIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  recenterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#208AEF",
  },
  recenterTextDisabled: {
    color: "#94A3B8",
  },
});

