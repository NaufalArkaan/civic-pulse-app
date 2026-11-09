/**
 * Civic Pulse - Modul LBS
 * Component: ReportMarker
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Performance & Accessibility Safeguards:
 * - Menggunakan `React.memo` untuk mencegah rerender marker yang tidak mengalami perubahan.
 * - `zIndex` dinamis: marker yang dipilih dinaikkan ke lapisan atas (zIndex 999).
 * - Mengatur `tracksViewChanges={false}` setelah render awal untuk menjaga frame rate Android.
 * - Area sentuh memadai (minimum 44x44 dp) dengan hitSlop untuk kenyamanan pengguna mobile.
 * - Aksesibilitas komprehensif: role, label, dan hint untuk pembaca layar (TalkBack / VoiceOver).
 */

import React, { memo, useEffect, useState, useRef } from "react";
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
  high: "#DC2626", // Merah Kritis
  medium: "#F59E0B", // Oranye Sedang
  low: "#10B981", // Hijau Rendah
};

const CATEGORY_NAMES: Record<CivicReportCategory, string> = {
  "road-damage": "Kerusakan Jalan",
  flood: "Banjir / Genangan",
  landslide: "Tanah Longsor",
  "street-light": "Lampu Jalan Padam",
};

const SEVERITY_NAMES: Record<CivicReportSeverity, string> = {
  high: "Kritis",
  medium: "Sedang",
  low: "Rendah",
};

export const ReportMarker = memo(
  function ReportMarker({ report, isSelected, onPress }: ReportMarkerProps) {
    const icon = CATEGORY_ICONS[report.category] || "📍";
    const categoryName = CATEGORY_NAMES[report.category] || report.category;
    const severityName = SEVERITY_NAMES[report.severity] || report.severity;
    const pinColor = SEVERITY_COLORS[report.severity] || "#4B5563";

    // Optimasi performa render marker pada engine Native Maps Android:
    // tracksViewChanges diaktifkan sesaat saat status isSelected berubah, lalu dimatikan kembali.
    const [tracksViewChanges, setTracksViewChanges] = useState<boolean>(true);
    const prevSelectedRef = useRef<boolean>(isSelected);

    useEffect(() => {
      if (prevSelectedRef.current !== isSelected) {
        prevSelectedRef.current = isSelected;
        setTracksViewChanges(true);
      }
    }, [isSelected]);

    useEffect(() => {
      if (tracksViewChanges) {
        const timer = setTimeout(() => {
          setTracksViewChanges(false);
        }, 150);
        return () => clearTimeout(timer);
      }
    }, [tracksViewChanges]);

    const a11yLabel = `Laporan Simulasi: ${report.title}. Kategori ${categoryName}, Tingkat keparahan ${severityName}.${
      isSelected ? " Saat ini sedang dipilih." : ""
    }`;

    return (
      <Marker
        key={report.id}
        coordinate={report.coordinate}
        onPress={(e) => {
          e.stopPropagation();
          onPress(report);
        }}
        zIndex={isSelected ? 999 : 10}
        tracksViewChanges={tracksViewChanges}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Ketuk untuk melihat detail laporan simulasi dan jarak garis lurus"
      >
        <View style={styles.touchTarget}>
          {/* Active selection pulse ring */}
          {isSelected && (
            <View
              style={[
                styles.selectionHalo,
                { borderColor: pinColor, backgroundColor: pinColor + "20" },
              ]}
            />
          )}

          {/* Main Pin Container */}
          <View
            style={[
              styles.markerPin,
              { borderColor: pinColor },
              isSelected && styles.markerPinSelected,
            ]}
          >
            <Text style={styles.iconText}>{icon}</Text>
          </View>

          {/* Severity Dot Indicator */}
          <View style={[styles.severityDot, { backgroundColor: pinColor }]} />
        </View>
      </Marker>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.report.id === nextProps.report.id &&
      prevProps.report.coordinate.latitude === nextProps.report.coordinate.latitude &&
      prevProps.report.coordinate.longitude === nextProps.report.coordinate.longitude
    );
  }
);

const styles = StyleSheet.create({
  touchTarget: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionHalo: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  markerPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
  markerPinSelected: {
    transform: [{ scale: 1.15 }],
    backgroundColor: "#EFF6FF",
    borderWidth: 3.5,
    elevation: 8,
  },
  iconText: {
    fontSize: 18,
    textAlign: "center",
  },
  severityDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
