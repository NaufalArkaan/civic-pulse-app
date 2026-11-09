/**
 * Civic Pulse - Modul LBS
 * Architectural Configuration: Adaptive Distance Intervals & Tracking Parameters
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 *
 * Catatan Arsitektur:
 * Nilai distanceInterval ini disesuaikan berdasarkan trade-off akurasi vs konsumsi baterai.
 * - high: 5 m (konsumsi baterai tinggi, presisi tinggi untuk inspeksi dekat)
 * - balanced: 20 m (default harian, konsumsi seimbang)
 * - low: 50 m (hemat daya, cocok saat pergerakan cepat/jarak jauh)
 */

import { TrackingMode } from "../types/location";

export type TrackingModeConfig = {
  distanceInterval: number; // Dalam meter
  timeInterval: number; // Dalam milidetik (fallback interval)
  label: string;
  description: string;
};

export const TRACKING_CONFIG: Record<TrackingMode, TrackingModeConfig> = {
  low: {
    distanceInterval: 50,
    timeInterval: 10000,
    label: "Hemat Baterai (50 m)",
    description:
      "Pembaruan lokasi setiap 50 meter untuk efisiensi daya maksimal",
  },
  balanced: {
    distanceInterval: 20,
    timeInterval: 5000,
    label: "Seimbang (20 m)",
    description:
      "Pembaruan lokasi setiap 20 meter, ideal untuk penggunaan harian",
  },
  high: {
    distanceInterval: 5,
    timeInterval: 2000,
    label: "Akurasi Tinggi (5 m)",
    description: "Pembaruan lokasi setiap 5 meter untuk pemetaan titik presisi",
  },
};

export const DISTANCE_INTERVALS = {
  low: 50,
  balanced: 20,
  high: 5,
} as const;

export const DEFAULT_TRACKING_MODE: TrackingMode = "balanced";
