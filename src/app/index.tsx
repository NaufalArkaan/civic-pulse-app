/**
 * Civic Pulse - Modul LBS
 * Screen: Map Screen (Interactive Mapping Engine & LBS Integration)
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 *
 * Integrasi Modul:
 * - Architecture & Contracts: Anggota 1 (Naufal)
 * - UI Components & Presentation: Anggota 2 (Syahril)
 * - LBS Hardware Hook & Spatial Utility: Anggota 3 (Robi)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MapView from "react-native-maps";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrackingMode } from "../types/location";
import { CivicReport } from "../types/report";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { haversineDistance } from "../utils/haversine";
import { formatDistance } from "../utils/formatDistance";
import { DEFAULT_FALLBACK_REGION, MAP_CONFIG } from "../constants/map";
import { SAMPLE_CIVIC_REPORTS } from "../constants/sampleReports";
import { DEFAULT_TRACKING_MODE } from "../constants/tracking";

import {
  CivicMap,
  MapControls,
  LocationStatusBanner,
  SelectedReportCard,
} from "../components/map";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // Mode pelacakan adaptif (low: 50m, balanced: 20m, high: 5m)
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(DEFAULT_TRACKING_MODE);

  // Laporan yang sedang dipilih untuk melihat detail & jarak
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);

  // Hook LBS: Mengelola lifecycle lokasi, foreground permission, & watcher
  const {
    location: userLocation,
    status: locationStatus,
    error: locationError,
    permissionGranted,
    refreshLocation,
  } = useLocationTracking({
    enabled: true,
    mode: trackingMode,
  });

  // Flag agar kamera hanya auto-center SEKALI saat lokasi pertama kali diperoleh
  const hasAutoCenteredRef = useRef<boolean>(false);

  useEffect(() => {
    if (userLocation && !hasAutoCenteredRef.current) {
      hasAutoCenteredRef.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: MAP_CONFIG.initialZoomDelta,
          longitudeDelta: MAP_CONFIG.initialZoomDelta,
        },
        MAP_CONFIG.recenterAnimationDurationMs
      );
    }
  }, [userLocation]);

  /**
   * Recenter manual via tombol "Lokasi Saya"
   */
  const handleRecenter = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: MAP_CONFIG.initialZoomDelta,
          longitudeDelta: MAP_CONFIG.initialZoomDelta,
        },
        MAP_CONFIG.recenterAnimationDurationMs
      );
    } else {
      refreshLocation();
    }
  }, [userLocation, refreshLocation]);

  /**
   * Handler pemilihan marker laporan
   */
  const handleSelectReport = useCallback((report: CivicReport) => {
    setSelectedReport(report);
  }, []);

  /**
   * Handler penekanan area kosong pada peta untuk menutup kartu
   */
  const handleMapPress = useCallback(() => {
    setSelectedReport(null);
  }, []);

  /**
   * Kalkulasi jarak garis lurus Haversine dari lokasi pengguna ke laporan terpilih
   */
  const formattedDistance = useMemo(() => {
    if (!selectedReport || !userLocation) {
      return "Menunggu lokasi";
    }
    const distanceMeters = haversineDistance(userLocation, selectedReport.coordinate);
    return formatDistance(distanceMeters);
  }, [userLocation, selectedReport]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Peta Interaktif & Marker */}
      <CivicMap
        mapRef={mapRef}
        region={DEFAULT_FALLBACK_REGION}
        userLocation={userLocation}
        reports={SAMPLE_CIVIC_REPORTS}
        selectedReportId={selectedReport?.id ?? null}
        onSelectReport={handleSelectReport}
        onMapPress={handleMapPress}
      />

      {/* Kontrol Peta (Mode Interval & Tombol Recenter) */}
      <View style={{ paddingTop: insets.top }}>
        <MapControls
          mode={trackingMode}
          onModeChange={setTrackingMode}
          onRecenter={handleRecenter}
          isRecenterDisabled={!userLocation && locationStatus === "loading"}
        />

        {/* Status & Error Banner */}
        <LocationStatusBanner
          status={locationStatus}
          error={locationError}
          permissionGranted={permissionGranted}
          onRetry={refreshLocation}
        />
      </View>

      {/* Kartu Detail Laporan & Kalkulasi Jarak Haversine */}
      {selectedReport && (
        <SelectedReportCard
          report={selectedReport}
          userLocation={userLocation}
          distanceFormatted={formattedDistance}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
});
