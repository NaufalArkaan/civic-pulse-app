/**
 * Civic Pulse - Pertemuan 10
 * Service: SecureStorageService (expo-secure-store wrapper)
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 *
 * Security & Architecture Safeguards:
 * 1. Menjaga kerahasiaan: nilai sensitif TIDAK PERNAH di-log ke console/analytics.
 * 2. Key namespacing: mencegah benturan key pada level OS Keystore/Keychain.
 * 3. Payload size guard: menolak penyimpanan media/Base64 besar (> 2048 bytes) ke SecureStore.
 * 4. Error isolation: menangani kegagalan native storage secara eksplisit tanpa crash.
 * 5. Platform awareness: verifikasi ketersediaan SecureStore via isAvailableAsync().
 */

import * as SecureStore from "expo-secure-store";
import {
  ISecureStorageService,
  SecureStorageKey,
  SecureStorageResult,
} from "../../types/secure";

// Batas aman ukuran payload SecureStore (2 KB). Media besar wajib masuk FileSystem sandbox!
const MAX_SECURE_PAYLOAD_BYTES = 2048;

class SecureStorageService implements ISecureStorageService {
  /**
   * Memeriksa ketersediaan API SecureStore pada perangkat fisik/emulator
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Menyimpan item sensitif (Token/NIK dummy/Kredensial) ke SecureStore
   */
  async setSensitiveItem(
    key: SecureStorageKey,
    value: string
  ): Promise<SecureStorageResult<void>> {
    if (!key || typeof key !== "string") {
      return {
        success: false,
        data: null,
        error: "Kunci SecureStore tidak valid atau kosong.",
      };
    }

    if (value === undefined || value === null) {
      return {
        success: false,
        data: null,
        error: "Nilai yang akan disimpan tidak boleh null/undefined.",
      };
    }

    // Security Guard: Tolak file media/Base64 yang salah diarahkan ke SecureStore
    const payloadBytes = new TextEncoder().encode(value).length;
    if (payloadBytes > MAX_SECURE_PAYLOAD_BYTES) {
      return {
        success: false,
        data: null,
        error: `Payload terlalu besar (${payloadBytes} bytes). SecureStore hanya untuk kredensial kecil <= 2KB. Gunakan FileSystem untuk media!`,
      };
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          data: null,
          error: "SecureStore tidak didukung pada platform atau perangkat ini.",
        };
      }

      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });

      return {
        success: true,
        data: null,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal menyimpan item ke SecureStore.",
      };
    }
  }

  /**
   * Membaca item sensitif dari SecureStore
   */
  async getSensitiveItem(
    key: SecureStorageKey
  ): Promise<SecureStorageResult<string>> {
    if (!key || typeof key !== "string") {
      return {
        success: false,
        data: null,
        error: "Kunci SecureStore tidak valid.",
      };
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          data: null,
          error: "SecureStore tidak didukung pada perangkat ini.",
        };
      }

      const value = await SecureStore.getItemAsync(key);

      return {
        success: true,
        data: value,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal mengambil item dari SecureStore.",
      };
    }
  }

  /**
   * Menghapus item sensitif dari SecureStore (misal saat logout / reset data demonstrasi)
   */
  async deleteSensitiveItem(
    key: SecureStorageKey
  ): Promise<SecureStorageResult<void>> {
    if (!key || typeof key !== "string") {
      return {
        success: false,
        data: null,
        error: "Kunci SecureStore tidak valid.",
      };
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          data: null,
          error: "SecureStore tidak didukung pada perangkat ini.",
        };
      }

      await SecureStore.deleteItemAsync(key);

      return {
        success: true,
        data: null,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal menghapus item dari SecureStore.",
      };
    }
  }
}

export const secureStorage = new SecureStorageService();
