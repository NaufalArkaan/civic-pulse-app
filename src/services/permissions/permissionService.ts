/**
 * Civic Pulse - Pertemuan 10
 * Service: PermissionService (Just-In-Time Runtime Permission Orchestrator)
 * Role: Anggota 1 & Anggota 3 (Robi) Integration Baseline
 *
 * JIT Principle:
 * Izin hanya diminta saat pengguna memicu aksi spesifik (misal: "Lokasi Saya" atau "Ambil Foto"),
 * bukan saat aplikasi baru diluncurkan tanpa konteks.
 */

import * as Location from "expo-location";
import {
  PermissionCheckResult,
  RuntimePermissionStatus,
  RuntimePermissionType,
} from "../../types/permissions";

export class PermissionService {
  /**
   * Memeriksa status izin saat ini tanpa memicu dialog prompt OS
   */
  async checkPermission(type: RuntimePermissionType): Promise<PermissionCheckResult> {
    try {
      if (type === "location") {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
        return {
          status: this.mapLocationStatus(status),
          canAskAgain,
        };
      }

      if (type === "media") {
        // Pada Expo DocumentPicker/Scoped Storage, akses berkas dipilih langsung oleh pengguna via sistem UI
        return {
          status: "granted",
          canAskAgain: true,
          message: "Akses media menggunakan System Document Picker (Scoped Storage) tanpa broad permission.",
        };
      }

      return {
        status: "granted",
        canAskAgain: true,
      };
    } catch (err: any) {
      return {
        status: "unavailable",
        canAskAgain: false,
        message: err?.message || "Layanan izin tidak tersedia.",
      };
    }
  }

  /**
   * Meminta izin runtime Just-In-Time saat pengguna memicu aksi
   */
  async requestPermission(type: RuntimePermissionType): Promise<PermissionCheckResult> {
    try {
      if (type === "location") {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        const mapped = this.mapLocationStatus(status);
        return {
          status: mapped,
          canAskAgain,
          message:
            mapped === "denied"
              ? "Izin lokasi ditolak. Fitur peta tetap aktif dengan koordinat demonstrasi."
              : undefined,
        };
      }

      return {
        status: "granted",
        canAskAgain: true,
      };
    } catch (err: any) {
      return {
        status: "unavailable",
        canAskAgain: false,
        message: err?.message || "Gagal meminta izin runtime.",
      };
    }
  }

  private mapLocationStatus(status: Location.PermissionStatus): RuntimePermissionStatus {
    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return "granted";
      case Location.PermissionStatus.DENIED:
        return "denied";
      case Location.PermissionStatus.UNDETERMINED:
      default:
        return "not-requested";
    }
  }
}

export const permissionService = new PermissionService();
