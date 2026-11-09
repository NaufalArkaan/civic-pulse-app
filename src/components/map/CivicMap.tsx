/**
 * Civic Pulse - Modul LBS
 * Component: CivicMap
 * Role: Anggota 2 (Syahril) UI Baseline / Contract
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
        onPress={onMapPress}
      >
        {/* User Location Marker (hanya muncul saat koordinat tersedia) */}
        {userLocation && (
          <UserLocationMarker
            coordinate={userLocation}
            trackingMode="balanced"
          />
        )}

        {/* Civic Incident Simulation Markers (Key stabil berdasarkan ID) */}
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
