/**
 * Civic Pulse - Pertemuan 10–13
 * Utility: File Validation, Name Sanitization & Privacy Masking
 * Role: Anggota 3 (Robi) & Anggota 1 (Naufal - Lead System Architect)
 */

export const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB limit untuk mendukung foto/dokumen/video resolusi tinggi

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/quicktime",
];

export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".pdf",
  ".txt",
  ".csv",
  ".json",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".mp4",
  ".mov",
];

const FORBIDDEN_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".js",
  ".vbs",
  ".ps1",
  ".msi",
  ".apk",
  ".com",
  ".scr",
];

/**
 * Sanitasi nama berkas untuk mencegah Path Traversal (CWE-22) dan karakter berbahaya
 */
export function sanitizeFileName(rawName: string): string {
  if (!rawName) return `file_${Date.now()}`;
  const base = rawName.replace(/^.*[\\/]/, "");
  let clean = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".");

  if (!clean || clean === "." || clean === "..") {
    clean = `file_${Date.now()}`;
  }

  return clean;
}

/**
 * Validasi ekstensi dan perkiraan tipe berkas (menolak file executable/script berbahaya)
 */
export function isAllowedFile(fileName: string, mimeType?: string | null): boolean {
  const lowerName = fileName.toLowerCase();

  // Tolak tegas ekstensi berbahaya (executable/script)
  if (FORBIDDEN_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return false;
  }

  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (mimeType) {
    const lowerMime = mimeType.toLowerCase();
    if (
      lowerMime.includes("msdownload") ||
      lowerMime.includes("javascript") ||
      lowerMime.includes("x-sh") ||
      lowerMime.includes("x-executable")
    ) {
      return false;
    }
    const isMimeAllowed =
      ALLOWED_MIME_TYPES.includes(lowerMime) ||
      lowerMime.startsWith("image/") ||
      lowerMime.startsWith("video/");
    return hasValidExt || isMimeAllowed;
  }

  return hasValidExt;
}

/**
 * Menentukan kategori dokumen berdasarkan nama dan MIME
 */
export function inferFileCategory(
  fileName: string,
  mimeType?: string | null
): "photo" | "document" | "other" {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif") ||
    mimeType?.startsWith("image/")
  ) {
    return "photo";
  }
  if (
    lower.endsWith(".pdf") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".ppt") ||
    lower.endsWith(".pptx") ||
    lower.endsWith(".csv") ||
    mimeType?.includes("pdf") ||
    mimeType?.includes("document") ||
    mimeType?.includes("text")
  ) {
    return "document";
  }
  return "other";
}

/**
 * Validasi ukuran berkas terkonfigurasi (mendukung file besar hingga 150 MB)
 */
export function validateFileSize(
  sizeBytes: number | null | undefined,
  maxBytes: number = MAX_FILE_SIZE_BYTES
): { valid: boolean; error?: string } {
  if (sizeBytes === null || sizeBytes === undefined) {
    return { valid: true };
  }
  if (sizeBytes < 0 || !Number.isFinite(sizeBytes)) {
    return { valid: false, error: "Ukuran berkas tidak valid." };
  }
  if (sizeBytes > maxBytes) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Ukuran berkas (${sizeMb} MB) melebihi batas maksimum ${maxMb} MB.`,
    };
  }
  return { valid: true };
}

export type FileValidationResult = {
  valid: boolean;
  sanitizedName: string;
  category: "photo" | "document" | "other";
  error?: string;
};

/**
 * Validasi komprehensif berkas masuk sebelum disalin ke Document Vault
 */
export function validateFileEntry(
  fileName: string,
  mimeType?: string | null,
  sizeBytes?: number | null,
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  const sanitized = sanitizeFileName(fileName);

  if (!isAllowedFile(sanitized, mimeType)) {
    return {
      valid: false,
      sanitizedName: sanitized,
      category: "other",
      error: `Format berkas "${sanitized}" tidak didukung demi keamanan. Gunakan gambar, PDF, dokumen Office, ZIP, atau video MP4.`,
    };
  }

  const sizeCheck = validateFileSize(sizeBytes, maxSizeBytes);
  if (!sizeCheck.valid) {
    return {
      valid: false,
      sanitizedName: sanitized,
      category: inferFileCategory(sanitized, mimeType),
      error: sizeCheck.error,
    };
  }

  return {
    valid: true,
    sanitizedName: sanitized,
    category: inferFileCategory(sanitized, mimeType),
  };
}

/**
 * Masking NIK untuk privasi pengguna di antarmuka (UI)
 */
export function maskNIK(nik: string | null | undefined): string {
  if (!nik) return "-";
  if (nik.length < 10) return "******";
  const start = nik.slice(0, 6);
  const end = nik.slice(-4);
  const maskedMiddle = "*".repeat(Math.max(4, nik.length - 10));
  return `${start}${maskedMiddle}${end}`;
}

/**
 * Masking Token Autentikasi untuk keamanan
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "-";
  if (token.length < 12) return "********";
  const prefix = token.slice(0, 10);
  const suffix = token.slice(-4);
  return `${prefix}****${suffix}`;
}
