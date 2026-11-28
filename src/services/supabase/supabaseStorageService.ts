/**
 * Civic Pulse - Supabase Storage Service
 * Service: Pengelolaan Upload, URL Publik, dan Sinkronisasi Foto Laporan Antarperangkat
 * Role: Lead Network, Offline Storage & Reliability Engineer (Robi) & Lead Architect (Naufal)
 *
 * Prinsip Desain:
 * 1. Single Authoritative Source: Setiap foto laporan yang tersinkronisasi memiliki URL publik
 *    unik pada Supabase Storage bucket 'civic-reports-media', sehingga semua perangkat melihat
 *    objek foto yang sama secara konsisten.
 * 2. Offline-First Preservation: Saat offline, foto disimpan di Document Vault (Scoped Storage) lokal.
 *    Ketika koneksi pulih, Outbox Queue otomatis mengunggah foto ke Supabase Storage terlebih dahulu,
 *    memperbarui media_path laporan menjadi URL publik, lalu menyinkronkan data ke PostgREST.
 * 3. Client Security: Hanya menggunakan publishable anon key (dilarang menggunakan service_role).
 */

import * as FileSystem from "expo-file-system/legacy";
import {
  auditSupabaseEnvironment,
  detectForbiddenClientKey,
} from "../../utils/supabaseSecurity";
import { normalizeLocalFileUri } from "../../utils/reportMedia";

export const REPORTS_STORAGE_BUCKET = "civic-reports-media";

export type StorageUploadResult = {
  success: boolean;
  publicUrl: string | null;
  storagePath: string | null;
  error: string | null;
};

export class SupabaseStorageService {
  private baseUrl: string;
  private anonKey: string;

  constructor() {
    this.baseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
    this.anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();

    // Pastikan tidak ada service_role key yang tidak sengaja terbawa di client
    const forbidden = detectForbiddenClientKey(this.anonKey);
    if (forbidden) {
      console.warn("[SupabaseStorage] Keamanan: Kunci dilarang terdeteksi pada client:", forbidden);
      this.anonKey = "";
    }
  }

  /**
   * Memeriksa apakah konfigurasi Supabase Storage siap digunakan
   */
  isConfigured(): boolean {
    const audit = auditSupabaseEnvironment(this.baseUrl, this.anonKey);
    return audit.isConfigured && !audit.securityViolation;
  }

  /**
   * Menghasilkan URL publik permanen dari sebuah object key di Supabase Storage
   */
  getPublicUrl(objectPath: string): string {
    const cleanPath = objectPath.replace(/^\/+/, "");
    return `${this.baseUrl}/storage/v1/object/public/${REPORTS_STORAGE_BUCKET}/${cleanPath}`;
  }

  /**
   * Mengunggah berkas foto lokal dari Scoped Storage ke Supabase Storage
   * Mengembalikan URL publik permanen yang dapat diakses oleh semua perangkat.
   */
  async uploadReportPhotoAsync(
    localUri: string,
    reportId: string,
    mimeType = "image/jpeg"
  ): Promise<StorageUploadResult> {
    const normalized = normalizeLocalFileUri(localUri);
    if (!normalized) {
      return {
        success: false,
        publicUrl: null,
        storagePath: null,
        error: "URI foto lokal tidak valid.",
      };
    }

    // Jika URI sudah berupa URL HTTP/HTTPS remote (misal foto yang sudah ada di cloud), kembalikan langsung
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return {
        success: true,
        publicUrl: normalized,
        storagePath: null,
        error: null,
      };
    }

    // Jika Supabase belum dikonfigurasi di environment, tetap izinkan fallback lokal
    if (!this.isConfigured()) {
      return {
        success: false,
        publicUrl: null,
        storagePath: null,
        error: "Supabase Storage belum dikonfigurasi di file .env.",
      };
    }

    try {
      // 1. Verifikasi keberadaan berkas fisik di sandbox lokal
      const info = await FileSystem.getInfoAsync(normalized);
      if (!info.exists) {
        return {
          success: false,
          publicUrl: null,
          storagePath: null,
          error: "Berkas foto lokal tidak ditemukan pada perangkat.",
        };
      }

      // 2. Tentukan nama objek unik pada bucket storage
      const ext = normalized.toLowerCase().endsWith(".png")
        ? "png"
        : normalized.toLowerCase().endsWith(".webp")
        ? "webp"
        : "jpg";
      const timestamp = Date.now();
      const objectPath = `reports/${reportId}_${timestamp}.${ext}`;
      const uploadEndpoint = `${this.baseUrl}/storage/v1/object/${REPORTS_STORAGE_BUCKET}/${objectPath}`;

      // 3. Unggah streaming biner melalui FileSystem.uploadAsync
      const uploadResponse = await FileSystem.uploadAsync(uploadEndpoint, normalized, {
        httpMethod: "POST",
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.anonKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
        const publicUrl = this.getPublicUrl(objectPath);
        return {
          success: true,
          publicUrl,
          storagePath: objectPath,
          error: null,
        };
      }

      // Coba fallback dengan Base64 / multipart jika binary streaming diblokir
      try {
        const base64Data = await FileSystem.readAsStringAsync(normalized, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Konversi base64 ke binary buffer array
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const fetchRes = await fetch(uploadEndpoint, {
          method: "POST",
          headers: {
            apikey: this.anonKey,
            Authorization: `Bearer ${this.anonKey}`,
            "Content-Type": mimeType,
            "x-upsert": "true",
          },
          body: byteArray,
        });

        if (fetchRes.ok) {
          const publicUrl = this.getPublicUrl(objectPath);
          return {
            success: true,
            publicUrl,
            storagePath: objectPath,
            error: null,
          };
        }
      } catch {
        // Abaikan dan gunakan error response awal
      }

      return {
        success: false,
        publicUrl: null,
        storagePath: null,
        error: `Gagal mengunggah foto ke Supabase Storage (Status HTTP ${uploadResponse.status}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        publicUrl: null,
        storagePath: null,
        error: err?.message || "Terjadi kesalahan saat mengunggah foto laporan.",
      };
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService();
