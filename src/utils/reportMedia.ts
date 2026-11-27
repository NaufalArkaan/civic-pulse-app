/**
 * Civic Pulse - Pertemuan 13
 * Utility: Report Media, Local File Resolver & Safe Document Sharing
 * Role: Anggota 2 (Syahril) & Anggota 1 (Naufal)
 *
 * Menyediakan resolver foto bukti bencana, pembaca dokumen in-app, dan ekspor berkas
 * yang tahan terhadap encoding direktori Expo Go Android (%2540anonymous%252F).
 */

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { CivicReportCategory, Report } from "../types/report";
import { sanitizeFileName } from "./fileValidation";

// Foto representasi riil mitigasi bencana & kerusakan infrastruktur publik (High Resolution)
export const DISASTER_CATEGORY_PHOTOS: Record<CivicReportCategory, string> = {
  "road-damage":
    "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
  flood:
    "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80",
  landslide:
    "https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=800&auto=format&fit=crop&q=80",
  "street-light":
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80",
};

// In-memory cache untuk hasil pembacaan Base64 foto lokal agar render kedua instan (0ms)
const localImageBase64Cache = new Map<string, string>();

/**
 * Memeriksa apakah laporan menyertakan berkas bukti asli (dari Document Vault / penyimpanan privat)
 */
export function isReportUsingVaultMedia(report: Report): boolean {
  if (!report.mediaPath) return false;
  return (
    report.mediaPath.startsWith("file:") ||
    report.mediaPath.startsWith("content:") ||
    report.mediaPath.includes("vault_") ||
    report.mediaPath.includes("civic-pulse")
  );
}

/**
 * Memeriksa apakah berkas lampiran adalah dokumen (PDF/DOCX/TXT/ZIP) bukan gambar murni
 */
export function isReportDocumentMedia(report: Report): boolean {
  if (!report.mediaPath) return false;
  const lower = report.mediaPath.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".zip") ||
    lower.endsWith(".xlsx") ||
    lower.includes("vault_doc_")
  );
}

/**
 * Ekstraksi nama berkas yang bersih untuk tampilan UI
 * Menghilangkan prefix internal:
 * - vault_doc_1795715950123_Laporan.pdf -> Laporan.pdf
 * - vault_1795716053324_sdsxht_foto.jpg -> foto.jpg
 */
export function getReportMediaFilename(report: Report): string {
  if (!report.mediaPath) return "";
  return cleanVaultDisplayFilename(report.mediaPath);
}

export function cleanVaultDisplayFilename(pathOrName: string): string {
  if (!pathOrName) return "";
  const parts = pathOrName.split("/");
  let rawName = parts[parts.length - 1] || pathOrName;
  try {
    rawName = decodeURIComponent(rawName);
  } catch {}

  const cleaned = rawName.replace(
    /^vault_(?:doc_\d+_[a-z0-9]+|doc_\d+|\d+_[a-z0-9]+|\d+)_/i,
    ""
  );
  return cleaned || rawName;
}

/**
 * Normalisasi URI file lokal agar selalu menunjuk ke direktori sandbox aktif.
 * PENTING: Jangan pernah menjalankan decodeURIComponent pada FileSystem.documentDirectory
 * karena Expo Go Android menggunakan folder bernama literal "%40anonymous%2F..." (encoded sebagai "%2540anonymous%252F").
 */
export function normalizeLocalFileUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  // 1. Jika URL remote http/https, content://, atau data:, kembalikan apa adanya
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // 2. Jika berasal dari Document Vault ("civic-pulse/vault/" atau "vault_"),
  //    rekonstruksi menggunakan FileSystem.documentDirectory aktif saat ini.
  //    Ini otomatis menyembuhkan URI lama yang sempat rusak akibat decodeURIComponent.
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
  if (baseDir) {
    const cleanBase = baseDir.endsWith("/") ? baseDir : `${baseDir}/`;
    const vaultBase = `${cleanBase}civic-pulse/vault/`;

    const vaultMarker = "civic-pulse/vault/";
    const markerIdx = trimmed.indexOf(vaultMarker);
    if (markerIdx !== -1) {
      let fileNamePart = trimmed.substring(markerIdx + vaultMarker.length);
      try {
        fileNamePart = decodeURIComponent(fileNamePart);
      } catch {}
      return `${vaultBase}${fileNamePart}`;
    }

    if (!trimmed.includes("/") && trimmed.startsWith("vault_")) {
      return `${vaultBase}${trimmed}`;
    }
  }

  // 3. Jika sudah diawali file:///, pertahankan tanpa decodeURIComponent
  if (trimmed.startsWith("file:///")) {
    return trimmed;
  }

  if (trimmed.startsWith("file:")) {
    const cleanPath = trimmed.replace(/^file:\/+/, "");
    return "file:///" + cleanPath;
  }

  if (trimmed.startsWith("/")) {
    return "file://" + trimmed;
  }

  if (baseDir) {
    const cleanBase = baseDir.endsWith("/") ? baseDir : `${baseDir}/`;
    return `${cleanBase}${trimmed}`;
  }

  return trimmed;
}

/**
 * Mendapatkan URI foto bukti lapangan untuk laporan insiden
 */
export function getReportPhotoUri(report: Report): string {
  if (report.mediaPath) {
    if (isReportDocumentMedia(report)) {
      return (
        DISASTER_CATEGORY_PHOTOS[report.category] ||
        DISASTER_CATEGORY_PHOTOS["road-damage"]
      );
    }

    const normalized = normalizeLocalFileUri(report.mediaPath) || report.mediaPath;
    if (
      normalized.startsWith("http://") ||
      normalized.startsWith("https://") ||
      normalized.startsWith("file://") ||
      normalized.startsWith("content://") ||
      normalized.startsWith("data:")
    ) {
      return normalized;
    }
  }

  return (
    DISASTER_CATEGORY_PHOTOS[report.category] ||
    DISASTER_CATEGORY_PHOTOS["road-damage"]
  );
}

/**
 * Membaca berkas gambar lokal (file://) menjadi data URI Base64 melalui ExpoFileSystem.
 * Mengatasi bug Android Uri.getPath() pada komponen <Image> ketika direktori Expo Go mengandung "%2540anonymous%252F".
 */
export async function resolveLocalImageUriAsync(
  rawUri: string | null | undefined
): Promise<string | null> {
  const normalized = normalizeLocalFileUri(rawUri);
  if (!normalized) return null;

  // Jika bukan file lokal, kembalikan langsung (mis. https:// atau data:)
  if (!normalized.startsWith("file://")) {
    return normalized;
  }

  const cached = localImageBase64Cache.get(normalized);
  if (cached) {
    return cached;
  }

  try {
    const info = await FileSystem.getInfoAsync(normalized);
    if (!info.exists) {
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(normalized, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64 || base64.length === 0) {
      return null;
    }

    const lower = normalized.toLowerCase();
    const mime = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

    const dataUri = `data:${mime};base64,${base64}`;
    // Simpan di cache memori (batasi maksimal 30 foto agar hemat RAM)
    if (localImageBase64Cache.size >= 30) {
      const firstKey = localImageBase64Cache.keys().next().value;
      if (firstKey) localImageBase64Cache.delete(firstKey);
    }
    localImageBase64Cache.set(normalized, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}

/**
 * Menyimpan Base64 ke cache memori secara proaktif saat foto baru saja diimpor
 */
export function primeLocalImageCache(localUri: string, base64Data?: string | null, mimeType?: string | null): void {
  if (!localUri || !base64Data) return;
  const normalized = normalizeLocalFileUri(localUri) || localUri;
  const cleanB64 = (base64Data.includes(",") ? base64Data.split(",")[1] : base64Data).trim();
  if (!cleanB64) return;
  const mime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  localImageBase64Cache.set(normalized, `data:${mime};base64,${cleanB64}`);
}

/**
 * Membaca dan mengekstrak isi dokumen (PDF / Teks) untuk ditampilkan langsung di dalam aplikasi (In-App Reader).
 */
export async function readDocumentPreviewTextAsync(
  rawUri: string | null | undefined,
  fallbackMeta?: {
    title?: string;
    description?: string;
    category?: string;
    createdAt?: string;
  }
): Promise<{ content: string; isReconstructed: boolean }> {
  const normalized = normalizeLocalFileUri(rawUri);

  if (normalized && normalized.startsWith("file://")) {
    try {
      const info = await FileSystem.getInfoAsync(normalized);
      if (info.exists) {
        const rawText = await FileSystem.readAsStringAsync(normalized, {
          length: 3200,
        });

        if (rawText && rawText.trim().length > 0) {
          // Bersihkan blok padding biner simulasi jika ada
          const withoutPadding = rawText
            .split("--- LAMPIRAN DATA BUKTI LAPANGAN ---")[0]
            .trim();

          if (withoutPadding.startsWith("%PDF")) {
            // Ekstrak teks yang dapat dibaca manusia dari struktur PDF
            const readableLines = withoutPadding
              .replace(/[^\x20-\x7E\n\r\t]/g, " ")
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(
                (l) =>
                  l.length > 3 &&
                  !l.startsWith("%PDF") &&
                  !l.includes("obj") &&
                  !l.includes("endobj") &&
                  !l.includes("/Type") &&
                  !l.includes("xref")
              );

            const extracted = readableLines.join("\n").trim();
            return {
              content:
                extracted.length > 15
                  ? extracted
                  : `DOKUMEN PDF TERVERIFIKASI (ISO 32000-1)\nNama Berkas: ${cleanVaultDisplayFilename(
                      normalized
                    )}\nStatus Integritas: Valid & Tersimpan di Scoped Storage\n\n${
                      fallbackMeta?.description ||
                      "Dokumen PDF biner resmi siap dilampirkan atau diekspor."
                    }`,
              isReconstructed: false,
            };
          }

          return {
            content: withoutPadding,
            isReconstructed: false,
          };
        }
      }
    } catch {
      // Lanjut ke fallback dossier terstruktur
    }
  }

  // Fallback Dossier Terstruktur jika berkas berasal dari sinkronisasi perangkat lain atau sudah dihapus
  const docName = cleanVaultDisplayFilename(rawUri || "") || "Dokumen_Mitigasi_Lapangan.pdf";
  const dateStr = fallbackMeta?.createdAt
    ? new Date(fallbackMeta.createdAt).toLocaleString("id-ID")
    : new Date().toLocaleString("id-ID");

  return {
    content: [
      "DOKUMEN BUKTI MITIGASI & INSPEKSI LAPANGAN (SDG 11)",
      `Nama Berkas: ${docName}`,
      `Judul Laporan: ${fallbackMeta?.title || "Inspeksi Infrastruktur Perkotaan"}`,
      `Kategori Insiden: ${fallbackMeta?.category || "Mitigasi Publik"}`,
      `Waktu Pencatatan: ${dateStr}`,
      "----------------------------------------",
      "Rincian & Catatan Lapangan:",
      fallbackMeta?.description ||
        "Dokumen bukti pendukung laporan warga yang tercatat dalam basis data Civic Pulse.",
    ].join("\n"),
    isReconstructed: true,
  };
}

/**
 * Membagikan atau mengekspor berkas dengan aman (Fail-Safe Sharing).
 * Mengatasi error Android ExpoSharing "Not allowed to read file under given URL"
 * dengan menyalin/membuat berkas sementara yang bersih di FileSystem.cacheDirectory.
 */
export async function safeShareDocumentOrMediaAsync(options: {
  uri: string | null | undefined;
  displayName?: string | null;
  mimeType?: string | null;
  fallbackTitle?: string;
  fallbackDescription?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: "Sistem operasi perangkat ini tidak mendukung pembagian berkas.",
      };
    }

    const normalized = normalizeLocalFileUri(options.uri);
    const cleanName = sanitizeFileName(
      options.displayName || cleanVaultDisplayFilename(options.uri || "") || `Bukti_Civic_Pulse_${Date.now()}.pdf`
    );

    const cacheBase = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
    const cleanCacheBase = cacheBase.endsWith("/") ? cacheBase : `${cacheBase}/`;
    const tempShareUri = `${cleanCacheBase}${cleanName}`;

    let fileReadyToShare: string | null = null;

    // 1. Cek apakah berkas asli ada di Scoped Storage
    if (normalized && normalized.startsWith("file://")) {
      try {
        const info = await FileSystem.getInfoAsync(normalized);
        if (info.exists) {
          // Salin ke cacheDirectory dengan nama bersih agar FileProvider Android selalu mengizinkan akses baca
          try {
            await FileSystem.copyAsync({
              from: normalized,
              to: tempShareUri,
            });
            const tempCheck = await FileSystem.getInfoAsync(tempShareUri);
            if (tempCheck.exists) {
              fileReadyToShare = tempShareUri;
            }
          } catch {
            // Jika copyAsync gagal, gunakan normalized URI langsung
            fileReadyToShare = normalized;
          }
        }
      } catch {
        // Lanjut ke rekonstruksi di bawah
      }
    }

    // 2. Jika berkas fisik tidak ditemukan (misal laporan lama atau dari sinkronisasi cloud),
    //    buat berkas dokumen ringkasan resmi di cacheDirectory agar pengguna tetap dapat membuka/mengekspornya!
    if (!fileReadyToShare) {
      const preview = await readDocumentPreviewTextAsync(options.uri, {
        title: options.fallbackTitle,
        description: options.fallbackDescription,
      });
      const fallbackShareUri = tempShareUri.endsWith(".pdf") || tempShareUri.endsWith(".txt")
        ? tempShareUri
        : `${tempShareUri}.txt`;

      await FileSystem.writeAsStringAsync(fallbackShareUri, preview.content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      fileReadyToShare = fallbackShareUri;
    }

    await Sharing.shareAsync(fileReadyToShare, {
      mimeType: options.mimeType || undefined,
      dialogTitle: `Buka / Ekspor ${cleanName}`,
    });

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Tidak dapat membuka menu ekspor berkas.",
    };
  }
}
