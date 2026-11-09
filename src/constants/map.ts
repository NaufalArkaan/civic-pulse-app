/**
 * Civic Pulse - Modul LBS
 * Architectural Configuration: Map Defaults & Fallback Region
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

import { MapRegion } from "../types/location";

/**
 * Fallback Region Aman (Kota Malang - Area Kampus III UMM / Tlogomas)
 * Digunakan sebagai koordinat awal sebelum GPS terkunci atau ketika izin ditolak,
 * sehingga MapView tetap render tanpa bergantung pada keberadaan GPS fisik.
 */
export const DEFAULT_FALLBACK_REGION: MapRegion = {
  latitude: -7.9213,
  longitude: 112.5994,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export const MAP_CONFIG = {
  initialZoomDelta: 0.01,
  recenterAnimationDurationMs: 800,
  minZoomLevel: 5,
  maxZoomLevel: 20,
};

