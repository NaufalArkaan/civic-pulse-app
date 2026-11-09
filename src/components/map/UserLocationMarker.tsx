/**
 * Civic Pulse - Modul LBS
 * Component: UserLocationMarker
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Performance Safeguards:
 * - Menggunakan `React.memo` untuk mencegah rerender saat koordinat tidak berubah.
 * - Mengatur `tracksViewChanges={false}` untuk mencegah native snapshot overhead pada Android MapView.
 * - Flat marker dengan anchor terpusat (0.5, 0.5) untuk kestabilan visual saat orientasi peta berubah.
 */

import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { UserMarkerProps } from "../../types/components";

export const UserLocationMarker = memo(function UserLocationMarker({
  coordinate,
  accuracy,
  trackingMode,
}: UserMarkerProps) {
  const roundedAccuracy = accuracy ? Math.round(accuracy) : null;
  const a11yLabel = `Posisi Anda saat ini. Mode pelacakan: ${trackingMode}.${
    roundedAccuracy ? ` Estimasi akurasi: kurang lebih ${roundedAccuracy} meter.` : ""
  }`;

  return (
    <Marker
      coordinate={coordinate}
      title="Posisi Anda"
      description={`Mode: ${trackingMode.toUpperCase()}${
        roundedAccuracy ? ` (±${roundedAccuracy} m)` : ""
      }`}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      tracksViewChanges={false}
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.markerContainer} accessible={false}>
        {/* Outer Halo / Pulse Ring */}
        <View style={styles.outerRing} />
        {/* Intermediate Beacon Ring */}
        <View style={styles.beaconRing} />
        {/* Core Position Dot */}
        <View style={styles.coreDot} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  markerContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(32, 138, 239, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(32, 138, 239, 0.45)",
  },
  beaconRing: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(32, 138, 239, 0.35)",
  },
  coreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#208AEF",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
});
