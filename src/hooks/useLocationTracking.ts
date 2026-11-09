/**
 * Civic Pulse - Modul LBS
 * Hook: useLocationTracking
 * Contract & Baseline Implementation (Kolaborasi Anggota 1 & Anggota 3 - Robi)
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 *
 * Security & Reliability Safeguards:
 * 1. Hanya meminta foreground location (no background location).
 * 2. Mencegah race-condition asynchronous update setelah unmount via isMountedRef.
 * 3. Pembersihan ketat subscription lama saat mode tracking berubah atau unmount.
 * 4. Tidak ada logging koordinat sensitif di production.
 * 5. Tidak ada persistensi lokasi personal ke storage lokal.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import {
  Coordinate,
  LocationStatus,
  UseLocationTrackingOptions,
  UseLocationTrackingResult,
} from "../types/location";
import { TRACKING_CONFIG, DEFAULT_TRACKING_MODE } from "../constants/tracking";
import { isValidCoordinate } from "../utils/haversine";

export function useLocationTracking(
  options: UseLocationTrackingOptions = {}
): UseLocationTrackingResult {
  const { enabled = true, mode = DEFAULT_TRACKING_MODE } = options;

  const [location, setLocation] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  // References untuk lifecycle safety
  const isMountedRef = useRef<boolean>(true);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isRequestingPermissionRef = useRef<boolean>(false);

  /**
   * Helper untuk menghentikan dan membersihkan subscription aktif dengan aman
   */
  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  /**
   * Mengambil lokasi terkini secara eksplisit (misal: saat tombol recenter ditekan)
   */
  const refreshLocation = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) {
        if (isMountedRef.current) {
          setStatus("error");
          setError("Layanan GPS/lokasi pada perangkat dalam keadaan nonaktif.");
        }
        return;
      }

      const { status: permStatus } = await Location.getForegroundPermissionsAsync();
      if (permStatus !== Location.PermissionStatus.GRANTED) {
        if (isMountedRef.current) {
          setStatus("permission-denied");
          setPermissionGranted(false);
          setError("Izin lokasi belum diberikan.");
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!isMountedRef.current) return;

      const coord: Coordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (isValidCoordinate(coord)) {
        setLocation(coord);
        setAccuracy(position.coords.accuracy ?? null);
        setStatus("tracking");
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setStatus("error");
        setError(err?.message || "Gagal memperbarui lokasi terkini.");
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Jika tracking dinonaktifkan dari options, bersihkan watcher
    if (!enabled) {
      cleanupSubscription();
      return () => {
        isMountedRef.current = false;
        cleanupSubscription();
      };
    }

    let isEffectActive = true;

    async function initTracking() {
      try {
        // 1. Cek layanan GPS perangkat
        const isServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isServicesEnabled) {
          if (isEffectActive && isMountedRef.current) {
            setStatus("error");
            setError("Layanan lokasi perangkat tidak aktif. Harap aktifkan GPS Anda.");
          }
          return;
        }

        // 2. Cek & minta izin foreground (hanya jika belum meminta)
        if (isRequestingPermissionRef.current) return;
        isRequestingPermissionRef.current = true;

        if (isEffectActive && isMountedRef.current) {
          setStatus("requesting-permission");
        }

        let { status: permStatus } = await Location.getForegroundPermissionsAsync();
        if (permStatus !== Location.PermissionStatus.GRANTED) {
          const req = await Location.requestForegroundPermissionsAsync();
          permStatus = req.status;
        }

        isRequestingPermissionRef.current = false;

        if (permStatus !== Location.PermissionStatus.GRANTED) {
          if (isEffectActive && isMountedRef.current) {
            setPermissionGranted(false);
            setStatus("permission-denied");
            setError(
              "Izin lokasi ditolak. Peta tetap dapat dilihat, namun posisi Anda tidak dapat dilacak."
            );
          }
          return;
        }

        if (isEffectActive && isMountedRef.current) {
          setPermissionGranted(true);
          setStatus("loading");
        }

        // 3. Ambil posisi awal (initial position) untuk respons cepat UI
        try {
          const initialPos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (isEffectActive && isMountedRef.current) {
            const initialCoord: Coordinate = {
              latitude: initialPos.coords.latitude,
              longitude: initialPos.coords.longitude,
            };
            if (isValidCoordinate(initialCoord)) {
              setLocation(initialCoord);
              setAccuracy(initialPos.coords.accuracy ?? null);
            }
          }
        } catch {
          // Jika initial position timeout/gagal, watcher akan tetap mencoba di bawah
        }

        // 4. Bersihkan subscription lama sebelum memulai watcher baru (menghindari duplikasi)
        cleanupSubscription();

        if (!isEffectActive || !isMountedRef.current) return;

        // 5. Konfigurasi adaptive interval dari TRACKING_CONFIG
        const config = TRACKING_CONFIG[mode] || TRACKING_CONFIG.balanced;
        const accuracyLevel =
          mode === "high"
            ? Location.Accuracy.High
            : mode === "low"
            ? Location.Accuracy.Low
            : Location.Accuracy.Balanced;

        // 6. Mulai watchPositionAsync foreground
        const sub = await Location.watchPositionAsync(
          {
            accuracy: accuracyLevel,
            distanceInterval: config.distanceInterval,
            timeInterval: config.timeInterval,
          },
          (newPosition) => {
            if (!isMountedRef.current) return;

            const nextCoord: Coordinate = {
              latitude: newPosition.coords.latitude,
              longitude: newPosition.coords.longitude,
            };

            if (isValidCoordinate(nextCoord)) {
              setLocation(nextCoord);
              setAccuracy(newPosition.coords.accuracy ?? null);
              setStatus("tracking");
              setError(null);
            }
          }
        );

        if (isEffectActive && isMountedRef.current) {
          subscriptionRef.current = sub;
          setStatus("tracking");
        } else {
          // Jika hook sudah unmount sebelum watcher siap, segera remove
          sub.remove();
        }
      } catch (err: any) {
        if (isEffectActive && isMountedRef.current) {
          setStatus("error");
          setError(err?.message || "Terjadi kesalahan saat memulai pelacakan lokasi.");
        }
      }
    }

    initTracking();

    return () => {
      isEffectActive = false;
      isMountedRef.current = false;
      cleanupSubscription();
    };
  }, [enabled, mode, cleanupSubscription]);

  return {
    location,
    accuracy,
    status: !enabled ? "idle" : status,
    error,
    permissionGranted,
    refreshLocation,
  };
}
