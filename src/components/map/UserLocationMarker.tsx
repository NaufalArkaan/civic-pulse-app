/**
 * Civic Pulse - Modul LBS
 * Component: UserLocationMarker
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { UserMarkerProps } from "../../types/components";

export const UserLocationMarker = memo(function UserLocationMarker({
  coordinate,
  trackingMode,
}: UserMarkerProps) {
  return (
    <Marker
      coordinate={coordinate}
      title="Posisi Anda"
      description={`Mode Pelacakan: ${trackingMode.toUpperCase()}`}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
    >
      <View style={styles.pulseContainer}>
        <View style={styles.outerRing} />
        <View style={styles.coreDot} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  pulseContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(32, 138, 239, 0.25)",
    borderWidth: 1.5,
    borderColor: "#208AEF",
  },
  coreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#208AEF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});

