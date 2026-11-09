/**
 * Civic Pulse - Modul LBS
 * Architectural Type Definitions: Location & Tracking
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type TrackingMode = "low" | "balanced" | "high";

export type LocationStatus =
  | "idle"
  | "requesting-permission"
  | "permission-denied"
  | "loading"
  | "tracking"
  | "error";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/**
 * Kontrak opsi untuk custom hook useLocationTracking
 */
export type UseLocationTrackingOptions = {
  /** Menentukan apakah tracking aktif (default: true) */
  enabled?: boolean;
  /** Mode adaptif interval: low (50m), balanced (20m), high (5m) */
  mode?: TrackingMode;
};

/**
 * Kontrak output API useLocationTracking yang disepakati bersama Robi (Anggota 3)
 */
export type UseLocationTrackingResult = {
  /** Koordinat terbaru pengguna; null jika belum diperoleh atau izin ditolak */
  location: Coordinate | null;
  /** Estimasi akurasi horizontal dalam meter; null jika belum ada */
  accuracy: number | null;
  /** Status siklus hidup pelacakan lokasi */
  status: LocationStatus;
  /** Pesan error ramah pengguna jika terjadi kegagalan; null jika normal */
  error: string | null;
  /** Status izin foreground location */
  permissionGranted: boolean;
  /** Fungsi pembaruan manual untuk meminta lokasi ulang secara terkontrol */
  refreshLocation: () => Promise<void>;
};

