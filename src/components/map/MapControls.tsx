/**
 * Civic Pulse - Modul LBS
 * Component: MapControls
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Ergonomics & Accessibility:
 * - Ukuran touch target memenuhi standar rekomendasi mobile (min 44-48 dp).
 * - Mendukung pergantian adaptif tracking mode (low: 50m, balanced: 20m, high: 5m).
 * - Tombol Recenter "Lokasi Saya" dengan visual state aktif/disabled.
 * - Kontras visual tinggi dengan latar belakang semi-transparan ber-blur/elevasi.
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
    <View style={styles.controlsRow} pointerEvents="box-none">
      {/* Mode Selector Group */}
      <View style={styles.modeContainer}>
        <Text style={styles.modeHeading}>Interval:</Text>
        <View style={styles.pillRow}>
          {MODES.map((m) => {
            const isActive = m === mode;
            const config = TRACKING_CONFIG[m];
            const displayLabel = m === "low" ? "50m" : m === "balanced" ? "20m" : "5m";

            return (
              <TouchableOpacity
                key={m}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => onModeChange(m)}
                accessibilityRole="button"
                accessibilityLabel={`Interval GPS ${config.distanceInterval} meter (${config.label})`}
                accessibilityState={{ selected: isActive }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {displayLabel}
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
        accessibilityHint="Memusatkan kamera peta ke koordinat posisi terkini Anda"
        accessibilityState={{ disabled: isRecenterDisabled }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: "100%",
  },
  modeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modeHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginRight: 6,
    marginLeft: 2,
  },
  pillRow: {
    flexDirection: "row",
    gap: 4,
  },
  pill: {
    minWidth: 42,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  pillActive: {
    backgroundColor: "#208AEF",
    elevation: 2,
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  recenterButton: {
    minHeight: 42,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  recenterDisabled: {
    opacity: 0.55,
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  recenterIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  recenterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#208AEF",
  },
  recenterTextDisabled: {
    color: "#94A3B8",
  },
});
