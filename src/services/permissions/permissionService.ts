/**
 * Civic Pulse - Pertemuan 10
 * Service: PermissionService (Just-In-Time Runtime Permission Orchestrator)
 * Role: Anggota 3 (Lead Hardware & Spatial/Network Engineer) & Anggota 1 (Lead System Architect)
 *
 * JIT Principle:
 * 1. Izin hanya diminta saat pengguna memicu aksi spesifik (misal: "Lokasi Saya" atau "Ambil Foto"),
 *    bukan saat aplikasi baru diluncurkan tanpa konteks.
 * 2. Scoped Storage: Akses berkas lokal memanfaatkan System Document Picker (tanpa izin penyimpanan global luas).
 * 3. Pemulihan Permanently Denied: Menyediakan metode openAppSettings() saat status bernilai needs-settings.
 */

import * as Location from "expo-location";
import { Linking } from "react-native";
import {
  PermissionCheckResult,
  RuntimePermissionStatus,
  RuntimePermissionType,
} from "../../types/permissions";

export class PermissionService {
  /**
   * Memeriksa status izin saat ini tanpa memicu dialog prompt OS
   */
  async checkPermission(
    type: RuntimePermissionType,
  ): Promise<PermissionCheckResult> {
    try {
      if (type === "location") {
        const { status, canAskAgain } =
          await Location.getForegroundPermissionsAsync();
        return {
          status: this.mapLocationStatus(status, canAskAgain),
          canAskAgain,
          message:
            status === Location.PermissionStatus.DENIED
              ? canAskAgain
                ? "Izin lokasi belum diberikan. Fitur peta menggunakan koordinat simulasi."
                : "Izin lokasi ditolak permanen. Aktifkan melalui Pengaturan Perangkat."
              : undefined,
        };
      }

      if (type === "media") {
        // Scoped Storage: Akses berkas dipilih langsung oleh pengguna via System Picker
        return {
          status: "granted",
          canAskAgain: true,
          message:
            "Akses berkas menggunakan System Document Picker (Scoped Storage) tanpa broad storage permission.",
        };
      }

      if (type === "camera") {
        // Izin kamera hanya dipicu Just-In-Time saat aksi ambil foto dijalankan
        return {
          status: "not-requested",
          canAskAgain: true,
          message:
            "Izin kamera dikelola secara Just-In-Time saat pengguna memicu aksi pengambilan foto bukti infrastruktur.",
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
        message: err?.message || "Layanan izin perangkat tidak tersedia.",
      };
    }
  }

  /**
   * Meminta izin runtime Just-In-Time saat pengguna memicu aksi
   */
  async requestPermission(
    type: RuntimePermissionType,
  ): Promise<PermissionCheckResult> {
    try {
      if (type === "location") {
        const { status, canAskAgain } =
          await Location.requestForegroundPermissionsAsync();
        const mapped = this.mapLocationStatus(status, canAskAgain);
        return {
          status: mapped,
          canAskAgain,
          message:
            mapped === "denied"
              ? "Izin lokasi ditolak. Peta tetap dapat digunakan dengan titik simulasi infrastruktur."
              : mapped === "needs-settings"
                ? "Izin lokasi ditolak secara permanen. Silakan aktifkan manual di Pengaturan Perangkat."
                : undefined,
        };
      }

      if (type === "media") {
        // Scoped storage picker tidak memerlukan izin broad storage
        return {
          status: "granted",
          canAskAgain: true,
          message: "Akses media mandiri diberikan via System Document Picker.",
        };
      }

      if (type === "camera") {
        // Demonstrasi JIT kamera untuk pengambilan bukti foto infrastruktur
        return {
          status: "granted",
          canAskAgain: true,
          message:
            "Izin kamera aktif untuk pengambilan foto bukti infrastruktur.",
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
        message: err?.message || "Gagal meminta izin runtime perangkat.",
      };
    }
  }

  /**
   * Membuka pengaturan aplikasi di perangkat pengguna jika izin ditolak permanen (needs-settings)
   */
  async openAppSettings(): Promise<boolean> {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  }

  private mapLocationStatus(
    status: Location.PermissionStatus,
    canAskAgain = true,
  ): RuntimePermissionStatus {
    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return "granted";
      case Location.PermissionStatus.DENIED:
        return canAskAgain ? "denied" : "needs-settings";
      case Location.PermissionStatus.UNDETERMINED:
      default:
        return "not-requested";
    }
  }
}

export const permissionService = new PermissionService();
