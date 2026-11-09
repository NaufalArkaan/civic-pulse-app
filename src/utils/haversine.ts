/**
 * Civic Pulse - Modul LBS
 * Spatial Math Utility: Haversine Formula & Coordinate Validation
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

import { Coordinate } from "../types/location";

const EARTH_RADIUS_METERS = 6_371_000; // Radius rata-rata bumi (WGS84 spherical approximation)

/**
 * Validasi ketat koordinat geografis
 * @returns true jika nilai latitude [-90, 90] dan longitude [-180, 180] serta bukan NaN/Infinity
 */
export function isValidCoordinate(coord: Coordinate | null | undefined): coord is Coordinate {
  if (!coord) return false;
  const { latitude, longitude } = coord;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return false;
  }

  if (!isFinite(latitude) || !isFinite(longitude)) {
    return false;
  }

  if (latitude < -90 || latitude > 90) {
    return false;
  }

  if (longitude < -180 || longitude > 180) {
    return false;
  }

  return true;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Menghitung jarak garis lurus (great-circle distance) antara dua titik koordinat
 * menggunakan formulasi Haversine.
 *
 * @param pointA Koordinat titik pertama (misal: posisi pengguna)
 * @param pointB Koordinat titik kedua (misal: lokasi laporan insiden)
 * @returns Jarak dalam meter (>= 0), atau null jika salah satu koordinat invalid
 */
export function haversineDistance(
  pointA: Coordinate | null | undefined,
  pointB: Coordinate | null | undefined
): number | null {
  if (!isValidCoordinate(pointA) || !isValidCoordinate(pointB)) {
    return null;
  }

  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(pointB.latitude - pointA.latitude);
  const deltaLon = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  // Membatasi a dalam [0, 1] untuk mengantisipasi floating point inaccuracies
  const boundedA = Math.min(1, Math.max(0, a));
  const centralAngle = 2 * Math.atan2(Math.sqrt(boundedA), Math.sqrt(1 - boundedA));

  return EARTH_RADIUS_METERS * centralAngle;
}

