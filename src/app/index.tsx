/**
 * Civic Pulse - Modul LBS
 * Screen: Map Screen (Interactive Mapping Engine & LBS Integration)
 * Role: Anggota 1 (System Architect) & Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Integrasi Kolaboratif Milestone 1:
 * - Arsitektur, Types & Kontrak: Anggota 1 (Naufal)
 * - Komponen UI, Interaktivitas, Safe Area & Performa: Anggota 2 (Syahril)
 * - LBS Hook, Watcher & Formulasi Haversine: Anggota 3 (Robi)
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

  // Mode interval adaptif (low: 50m, balanced: 20m, high: 5m)
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(DEFAULT_TRACKING_MODE);

  // Laporan yang sedang dipilih untuk melihat detail & jarak Haversine
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);

  // Hook LBS: Mengelola lifecycle lokasi, permission foreground, watcher & error
  const {
    location: userLocation,
    accuracy: userAccuracy,
    status: locationStatus,
    error: locationError,
    permissionGranted,
    refreshLocation,
  } = useLocationTracking({
    enabled: true,
    mode: trackingMode,
  });

  // Flag proteksi: kamera hanya auto-center SEKALI saat GPS pertama kali terkunci
  // untuk mencegah gangguan saat pengguna sedang melakukan pan/zoom bebas di peta
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
   * Handler pemilihan marker laporan simulasi
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
   * Handler pemusatan kamera ke marker laporan yang sedang aktif
   */
  const handleFocusReport = useCallback((report: CivicReport) => {
    mapRef.current?.animateToRegion(
      {
        latitude: report.coordinate.latitude,
        longitude: report.coordinate.longitude,
        latitudeDelta: MAP_CONFIG.initialZoomDelta,
        longitudeDelta: MAP_CONFIG.initialZoomDelta,
      },
      MAP_CONFIG.recenterAnimationDurationMs
    );
  }, []);

  /**
   * Kalkulasi jarak garis lurus Haversine dari lokasi pengguna ke laporan terpilih.
   * Dimemoize untuk menghindari perhitungan ulang selama koordinat stabil.
   */
  const formattedDistance = useMemo(() => {
    if (!selectedReport || !userLocation) {
      return "Menunggu lokasi";
    }
    const distanceMeters = haversineDistance(userLocation, selectedReport.coordinate);
    return formatDistance(distanceMeters);
  }, [userLocation, selectedReport]);

  const topInsetPadding = Math.max(insets.top, 12);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Peta Interaktif & Custom Markers (Lapisan Dasar) */}
      <CivicMap
        mapRef={mapRef}
        region={DEFAULT_FALLBACK_REGION}
        userLocation={userLocation}
        accuracy={userAccuracy}
        trackingMode={trackingMode}
        reports={SAMPLE_CIVIC_REPORTS}
        selectedReportId={selectedReport?.id ?? null}
        onSelectReport={handleSelectReport}
        onMapPress={handleMapPress}
      />

      {/* Top Floating Overlay: Kontrol Peta & Banner Status */}
      <View
        style={[styles.topOverlayContainer, { paddingTop: topInsetPadding }]}
        pointerEvents="box-none"
      >
        <MapControls
          mode={trackingMode}
          onModeChange={setTrackingMode}
          onRecenter={handleRecenter}
          isRecenterDisabled={!userLocation && locationStatus === "loading"}
        />

        <LocationStatusBanner
          status={locationStatus}
          error={locationError}
          permissionGranted={permissionGranted}
          onRetry={refreshLocation}
        />
      </View>

      {/* Bottom Floating Card: Detail Laporan Terpilih & Jarak Haversine */}
      {selectedReport && (
        <SelectedReportCard
          report={selectedReport}
          userLocation={userLocation}
          distanceFormatted={formattedDistance}
          onClose={handleMapPress}
          onFocusReport={handleFocusReport}
          insets={insets}
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
  topOverlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
