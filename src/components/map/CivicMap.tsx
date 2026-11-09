/**
 * Civic Pulse - Modul LBS
 * Component: CivicMap
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Performance Safeguards:
 * - Komponen MapView diisolasi dalam pembungkus deklaratif yang dimemoize.
 * - Key stabil berbasis ID laporan unik (`report.id`).
 * - Menyediakan initial/fallback region aman tanpa ketergantungan pada status GPS awal.
 * - Tidak memaksa kamera kembali ke pengguna setiap kali GPS update (kontrol kamera dipisahkan ke parent).
 */

import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import { CivicMapProps } from "../../types/components";
import { UserLocationMarker } from "./UserLocationMarker";
import { ReportMarker } from "./ReportMarker";

export const CivicMap = memo(function CivicMap({
  region,
  userLocation,
  reports,
  selectedReportId,
  onSelectReport,
  onMapPress,
  mapRef,
  trackingMode = "balanced",
  accuracy,
}: CivicMapProps) {
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={false} // Menggunakan custom UserLocationMarker sesuai deliverable LBS
        showsMyLocationButton={false} // Menggunakan custom MapControls
        showsCompass={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        onPress={onMapPress}
      >
        {/* User Location Marker (Hanya muncul jika koordinat telah diperoleh) */}
        {userLocation && (
          <UserLocationMarker
            coordinate={userLocation}
            accuracy={accuracy}
            trackingMode={trackingMode}
          />
        )}

        {/* Civic Incident Simulation Markers (Key stabil berbasis report.id) */}
        {reports.map((report) => (
          <ReportMarker
            key={report.id}
            report={report}
            isSelected={selectedReportId === report.id}
            onPress={onSelectReport}
          />
        ))}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
