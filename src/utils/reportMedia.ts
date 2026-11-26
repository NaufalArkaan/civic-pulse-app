/**
 * Civic Pulse - Pertemuan 13
 * Utility: Report Media & Disaster Photo Resolver
 * Role: Anggota 2 (Syahril) & Anggota 1 (Naufal)
 *
 * Menyediakan resolver foto bukti bencana / kerusakan infrastruktur
 * yang terintegrasi antara Document Vault Scoped Storage, URL remote, dan visualisasi peta (SDG 11).
 */

import * as FileSystem from "expo-file-system/legacy";
import { CivicReportCategory, Report } from "../types/report";

// Foto representasi riil mitigasi bencana & kerusakan infrastruktur publik (High Resolution)
export const DISASTER_CATEGORY_PHOTOS: Record<CivicReportCategory, string> = {
  "road-damage":
    "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
  flood:
    "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80",
  landslide:
    "https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=800&auto=format&fit=crop&q=80",
  "street-light":
    "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80",
};

/**
 * Memeriksa apakah laporan menyertakan berkas bukti asli (dari Document Vault / penyimpanan privat)
 */
export function isReportUsingVaultMedia(report: Report): boolean {
  if (!report.mediaPath) return false;
  return (
    report.mediaPath.startsWith("file://") ||
    report.mediaPath.startsWith("content://") ||
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
    lower.includes("pdf")
  );
}

/**
 * Ekstraksi nama berkas yang bersih untuk tampilan UI
 */
export function getReportMediaFilename(report: Report): string {
  if (!report.mediaPath) return "";
  const parts = report.mediaPath.split("/");
  const rawName = parts[parts.length - 1];
  // Bersihkan prefix ID unik jika ada (e.g. vault_12345_nama_file.pdf -> nama_file.pdf)
  if (rawName.startsWith("vault_")) {
    const subParts = rawName.split("_");
    if (subParts.length >= 3) {
      return subParts.slice(2).join("_");
    }
  }
  return rawName;
}

/**
 * Normalisasi URI file lokal agar selalu valid (file:///data/...)
 * Mengatasi masalah deep-linking Expo Router yang sering meng-encode atau mereduksi slash menjadi file:/
 */
export function normalizeLocalFileUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {}

  // Jika URL remote http/https
  if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
    return decoded;
  }

  // Jika content://
  if (decoded.startsWith("content://")) {
    return decoded;
  }

  // Jika diawali file: (misal file:/data/... atau file://data/...)
  if (decoded.startsWith("file:")) {
    const cleanPath = decoded.replace(/^file:\/+/, "");
    return "file:///" + cleanPath;
  }

  // Jika absolute Unix path (/data/user/0/...)
  if (decoded.startsWith("/")) {
    return "file://" + decoded;
  }

  // Jika relative path di dalam app document directory
  const base = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  return `${cleanBase}${decoded}`;
}

/**
 * Mendapatkan URI foto bukti lapangan untuk laporan insiden
 */
export function getReportPhotoUri(report: Report): string {
  if (report.mediaPath) {
    // Jika berupa dokumen PDF/DOCX, fallback ke foto kategori mitigasi untuk konteks visual
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
      normalized.startsWith("content://")
    ) {
      return normalized;
    }
  }
  return (
    DISASTER_CATEGORY_PHOTOS[report.category] ||
    DISASTER_CATEGORY_PHOTOS["road-damage"]
  );
}
