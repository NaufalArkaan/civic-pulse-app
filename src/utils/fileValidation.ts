/**
 * Civic Pulse - Pertemuan 10
 * Utility: File Validation, Name Sanitization & Privacy Masking
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt"];

/**
 * Sanitasi nama berkas untuk mencegah Path Traversal (CWE-22)
 */
export function sanitizeFileName(rawName: string): string {
  if (!rawName) return `file_${Date.now()}`;
  // Hapus path traversal (../, ..\, /) dan karakter terlarang
  const clean = rawName
    .replace(/^.*[\\/]/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".");
  return clean || `file_${Date.now()}`;
}

/**
 * Validasi ekstensi dan perkiraan tipe berkas
 */
export function isAllowedFile(fileName: string, mimeType?: string | null): boolean {
  const lowerName = fileName.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (mimeType) {
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
    return hasValidExt || isMimeAllowed;
  }

  return hasValidExt;
}

/**
 * Menentukan kategori dokumen berdasarkan nama dan MIME
 */
export function inferFileCategory(fileName: string, mimeType?: string | null): "photo" | "document" | "other" {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    mimeType?.startsWith("image/")
  ) {
    return "photo";
  }
  if (lower.endsWith(".pdf") || lower.endsWith(".txt") || mimeType?.includes("pdf")) {
    return "document";
  }
  return "other";
}

/**
 * Masking NIK untuk privasi pengguna di antarmuka (UI)
 * Contoh: "3573031204010001" -> "357303******0001"
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
 * Masking Token Autentikasi untuk keamanan demonstrasi
 * Contoh: "civic_tok_e91b2c3d4e5f6a7b" -> "civic_tok_****6a7b"
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "-";
  if (token.length < 12) return "********";
  const prefix = token.slice(0, 10);
  const suffix = token.slice(-4);
  return `${prefix}****${suffix}`;
}
