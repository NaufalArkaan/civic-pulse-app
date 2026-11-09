/**
 * Civic Pulse - Modul LBS
 * Component: ReportMarker
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
 */

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { ReportMarkerProps } from "../../types/components";
import { CivicReportCategory, CivicReportSeverity } from "../../types/report";

const CATEGORY_ICONS: Record<CivicReportCategory, string> = {
  "road-damage": "🚧",
  flood: "🌊",
  landslide: "⚠️",
  "street-light": "💡",
};

const SEVERITY_COLORS: Record<CivicReportSeverity, string> = {
  high: "#DC2626", // Merah
  medium: "#F59E0B", // Oranye
  low: "#10B981", // Hijau
};

export const ReportMarker = memo(function ReportMarker({
  report,
  isSelected,
  onPress,
}: ReportMarkerProps) {
  const icon = CATEGORY_ICONS[report.category] || "📍";
  const pinColor = SEVERITY_COLORS[report.severity] || "#4B5563";

  return (
    <Marker
      key={report.id}
      coordinate={report.coordinate}
      onPress={(e) => {
        e.stopPropagation();
        onPress(report);
      }}
      tracksViewChanges={false}
    >
      <View
        style={[
          styles.markerContainer,
          { borderColor: pinColor },
          isSelected && styles.selectedMarker,
        ]}
      >
        <Text style={styles.iconText}>{icon}</Text>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 4,
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
    backgroundColor: "#EFF6FF",
    borderWidth: 3.5,
    elevation: 8,
  },
  iconText: {
    fontSize: 16,
  },
});

