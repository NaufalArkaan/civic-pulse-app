/**
 * Civic Pulse - Pertemuan 13 (Milestone 5)
 * Utility: Canonical Error Taxonomy & Sensitive Data Redaction
 * Role: Anggota 1 (Naufal - Lead System Architect & Security Engineer)
 *
 * Architect's Audit Protocol — Check 1:
 * 1. Klasifikasi eksplisit ke dalam 9 kategori:
 *    validation | permission | network | timeout | auth | server | storage | conflict | unknown
 * 2. Pesan pengguna (userMessage) aman, jelas, dan actionable (tanpa raw SQL/stacktrace).
 * 3. Redaksi otomatis (redactSensitiveData) mencegah kebocoran JWT, NIK 16-digit,
 *    service_role key, dan koordinat presisi tinggi pada log teknis.
 */

export type ErrorCategory =
  | "validation"
  | "permission"
  | "network"
  | "timeout"
  | "auth"
  | "server"
  | "storage"
  | "conflict"
  | "unknown";

export type RecoveryAction =
  | "retry"
  | "open_settings"
  | "save_draft_offline"
  | "reauthenticate"
  | "fix_input"
  | "refresh_data"
  | "contact_support";

export interface ClassifiedError {
  category: ErrorCategory;
  code: string;
  userMessage: string;
  actionableStep: string;
  recoveryAction: RecoveryAction;
  isRetryable: boolean;
  safeTechnicalSummary: string;
}

/**
 * Menghapus/menyensor token JWT, kunci rahasia Supabase, NIK 16 digit,
 * serta koordinat GPS presisi tinggi dari pesan log/error.
 */
export function redactSensitiveData(input: string): string {
  if (!input || typeof input !== "string") return "";

  return (
    input
      // 1. Sensor JWT Token (eyJ...)
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
      // 2. Sensor Supabase Secret / Service Role Keys
      .replace(/sb_secret_[A-Za-z0-9_-]+/g, "[REDACTED_SUPABASE_SECRET]")
      .replace(/service_role/gi, "[REDACTED_ROLE_KEY]")
      // 3. Sensor Bearer Token
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED_TOKEN]")
      // 4. Sensor NIK 16 digit
      .replace(/\b\d{16}\b/g, "[REDACTED_NIK]")
      // 5. Sensor koordinat presisi tinggi (>3 desimal) menjadi kasar
      .replace(/(-?\d{1,3}\.\d{3})\d+/g, "$1***")
  );
}

/**
 * Mengklasifikasikan error mentah (HTTP status, exception, atau error pesan)
 * menjadi struktur ClassifiedError yang aman bagi UI dan log.
 */
export function classifyAppError(
  error: unknown,
  httpStatus?: number
): ClassifiedError {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : (error as any)?.message || "Terjadi kesalahan yang tidak diketahui";

  const safeSummary = redactSensitiveData(rawMessage);
  const lower = rawMessage.toLowerCase();

  // 1. Timeout Errors
  if (
    httpStatus === 408 ||
    httpStatus === 504 ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted")
  ) {
    return {
      category: "timeout",
      code: "ERR_TIMEOUT",
      userMessage: "Waktu koneksi ke server habis karena jaringan lambat.",
      actionableStep: "Coba lagi atau simpan laporan ke antrean offline.",
      recoveryAction: "retry",
      isRetryable: true,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 2. Network / Offline Errors
  if (
    httpStatus === 0 ||
    lower.includes("network request failed") ||
    lower.includes("offline") ||
    lower.includes("fetch failed") ||
    lower.includes("unreachable")
  ) {
    return {
      category: "network",
      code: "ERR_NETWORK_UNREACHABLE",
      userMessage: "Koneksi internet terputus atau server belum dapat dijangkau.",
      actionableStep: "Perubahan Anda akan diamankan di Outbox lokal dan dikirim saat online.",
      recoveryAction: "save_draft_offline",
      isRetryable: true,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 3. Auth / Session / RLS Forbidden
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    lower.includes("jwt expired") ||
    lower.includes("unauthorized") ||
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    lower.includes("forbidden")
  ) {
    return {
      category: "auth",
      code: httpStatus === 403 ? "ERR_RLS_FORBIDDEN" : "ERR_AUTH_SESSION",
      userMessage:
        httpStatus === 403 || lower.includes("row-level security") || lower.includes("rls")
          ? "Anda tidak memiliki hak akses untuk mengubah data laporan ini."
          : "Sesi autentikasi telah berakhir atau tidak valid.",
      actionableStep:
        httpStatus === 403
          ? "Gunakan akun dengan peran petugas/pemilik laporan yang sesuai."
          : "Silakan perbarui sesi kredensial Anda di Document Vault.",
      recoveryAction: "reauthenticate",
      isRetryable: false,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 4. Conflict / Duplicate / Stale Version
  if (
    httpStatus === 409 ||
    lower.includes("conflict") ||
    lower.includes("duplicate") ||
    lower.includes("unique constraint") ||
    lower.includes("stale")
  ) {
    return {
      category: "conflict",
      code: "ERR_DATA_CONFLICT",
      userMessage: "Laporan telah diperbarui oleh pengguna atau petugas lain.",
      actionableStep: "Muat ulang daftar laporan untuk melihat status terbaru.",
      recoveryAction: "refresh_data",
      isRetryable: false,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 5. Device Permission Denied
  if (
    lower.includes("permission") ||
    lower.includes("izin lokasi") ||
    lower.includes("izin kamera") ||
    lower.includes("denied")
  ) {
    return {
      category: "permission",
      code: "ERR_PERMISSION_DENIED",
      userMessage: "Izin akses perangkat belum diberikan.",
      actionableStep: "Buka Pengaturan Perangkat untuk mengaktifkan izin atau gunakan mode manual.",
      recoveryAction: "open_settings",
      isRetryable: false,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 6. Storage / FileSystem / SecureStore / SQLite
  if (
    lower.includes("storage") ||
    lower.includes("filesystem") ||
    lower.includes("securestore") ||
    lower.includes("sqlite") ||
    lower.includes("vault") ||
    lower.includes("disk")
  ) {
    return {
      category: "storage",
      code: "ERR_LOCAL_STORAGE",
      userMessage: "Gagal mengakses ruang penyimpanan lokal perangkat.",
      actionableStep: "Pastikan ruang penyimpanan perangkat mencukupi lalu coba kembali.",
      recoveryAction: "retry",
      isRetryable: true,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 7. Validation Errors (400 / 422 / Domain Rules)
  if (
    httpStatus === 400 ||
    httpStatus === 422 ||
    lower.includes("validasi") ||
    lower.includes("invalid") ||
    lower.includes("tidak valid") ||
    lower.includes("transisi status")
  ) {
    return {
      category: "validation",
      code: "ERR_VALIDATION",
      userMessage: "Data laporan atau perubahan status tidak memenuhi aturan validasi.",
      actionableStep: "Periksa kembali kelengkapan kolom input atau urutan status laporan.",
      recoveryAction: "fix_input",
      isRetryable: false,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 8. Server Errors (5xx / Rate Limit 429)
  if (
    (httpStatus !== undefined && httpStatus >= 500) ||
    httpStatus === 429 ||
    lower.includes("internal server error") ||
    lower.includes("bad gateway")
  ) {
    return {
      category: "server",
      code: httpStatus === 429 ? "ERR_RATE_LIMIT" : "ERR_SERVER_5XX",
      userMessage: "Layanan server sedang mengalami gangguan sementara.",
      actionableStep: "Tunggu beberapa saat lalu coba kirim ulang.",
      recoveryAction: "retry",
      isRetryable: true,
      safeTechnicalSummary: safeSummary,
    };
  }

  // 9. Unknown Fallback
  return {
    category: "unknown",
    code: "ERR_UNKNOWN",
    userMessage: "Terjadi kendala saat memproses permintaan Anda.",
    actionableStep: "Silakan coba lagi atau periksa koneksi perangkat Anda.",
    recoveryAction: "retry",
    isRetryable: true,
    safeTechnicalSummary: safeSummary,
  };
}
