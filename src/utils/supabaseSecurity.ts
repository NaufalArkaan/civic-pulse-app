/**
 * Civic Pulse - Pertemuan 13 (Milestone 5)
 * Utility: Supabase Security Guard, Environment Audit & Authoritative State Machine
 * Role: Anggota 1 (Naufal - Lead System Architect & Security Engineer)
 *
 * Pure deterministic security & data-integrity validators (Zero native bindings):
 * 1. Service-Role Secret Guard: Menolak `service_role` atau `sb_secret_` di sisi client.
 * 2. Environment Separation Audit: Memvalidasi URL HTTPS dan anon key.
 * 3. Authoritative Status Transitions: State machine laporan berdasarkan peran (role).
 * 4. Query Pagination Clamping: Mencegah unbounded SELECT queries (>100 rows).
 */

import type { ReportStatus } from "../types/report";

export const SUPABASE_QUERY_LIMITS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  REQUEST_TIMEOUT_MS: 8000,
} as const;

export type UserRole = "citizen_reporter" | "field_officer" | "coordinator_admin";

export interface SupabaseEnvironmentAudit {
  isConfigured: boolean;
  environmentName: "production" | "staging" | "development_local";
  urlHost: string | null;
  hasValidAnonKey: boolean;
  securityViolation: string | null;
}

const ALLOWED_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  submitted: ["verified", "rejected"],
  verified: ["in_progress", "rejected"],
  in_progress: ["resolved"],
  resolved: [],
  rejected: [],
};

/**
 * Memvalidasi apakah perubahan status laporan diizinkan menurut state machine
 * dan peran pengguna (citizen_reporter tidak boleh memverifikasi laporan sendiri).
 */
export function validateStatusTransition(
  currentStatus: ReportStatus,
  nextStatus: ReportStatus,
  role: UserRole = "field_officer"
): { valid: boolean; reason: string | null } {
  if (currentStatus === nextStatus) {
    return { valid: true, reason: null };
  }

  if (role === "citizen_reporter") {
    return {
      valid: false,
      reason:
        "Pelapor warga tidak memiliki otorisasi untuk mengubah status verifikasi laporan (Enforced by RLS & Domain Policy).",
    };
  }

  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Transisi status tidak sah dari '${currentStatus}' ke '${nextStatus}'. Urutan yang diizinkan: ${
        allowedNext.length > 0 ? allowedNext.join(" / ") : "Status sudah final (terminal)"
      }.`,
    };
  }

  return { valid: true, reason: null };
}

/**
 * Memeriksa apakah key yang diberikan mengandung indikasi service_role atau secret key
 * yang DILARANG KERAS berada di aplikasi mobile client.
 */
export function detectForbiddenClientKey(key?: string | null): string | null {
  if (!key) return null;
  const trimmed = key.trim();

  if (trimmed.startsWith("sb_secret_")) {
    return "SECURITY_VIOLATION: Terdeteksi Supabase Secret Key (sb_secret_) di sisi client!";
  }

  if (trimmed.toLowerCase().includes("service_role")) {
    return "SECURITY_VIOLATION: Terdeteksi kata kunci service_role pada konfigurasi client!";
  }

  // Jika berformat JWT (3 segmen base64url), periksa payload claim "role"
  const parts = trimmed.split(".");
  if (parts.length === 3 && typeof atob === "function") {
    try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const decoded = atob(padded);
      if (decoded.includes('"role":"service_role"') || decoded.includes('"role": "service_role"')) {
        return "SECURITY_VIOLATION: JWT memiliki klaim role 'service_role' yang mem-bypass RLS!";
      }
    } catch {
      // Abaikan jika bukan base64 standar
    }
  }

  return null;
}

/**
 * Mengaudit konfigurasi environment Supabase tanpa membocorkan nilai kunci
 */
export function auditSupabaseEnvironment(
  customUrl?: string,
  customKey?: string
): SupabaseEnvironmentAudit {
  const rawUrl = customUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const rawKey = customKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const violation = detectForbiddenClientKey(rawKey);
  if (violation) {
    return {
      isConfigured: false,
      environmentName: "development_local",
      urlHost: null,
      hasValidAnonKey: false,
      securityViolation: violation,
    };
  }

  const isUrlValid =
    rawUrl.startsWith("https://") &&
    !rawUrl.includes("dummy") &&
    !rawUrl.includes("example.com") &&
    rawUrl.length > 15;

  const isKeyValid = rawKey.length > 20 && !rawKey.includes("dummy");

  let urlHost: string | null = null;
  if (isUrlValid) {
    try {
      urlHost = new URL(rawUrl).host;
    } catch {
      urlHost = null;
    }
  }

  const isConfigured = Boolean(isUrlValid && isKeyValid && urlHost);

  return {
    isConfigured,
    environmentName: isConfigured
      ? rawUrl.includes("staging")
        ? "staging"
        : "production"
      : "development_local",
    urlHost,
    hasValidAnonKey: isKeyValid,
    securityViolation: null,
  };
}

/**
 * Mengamankan nilai limit pagination agar tidak melebihi batas maksimum
 */
export function clampQueryLimit(requestedLimit?: number): number {
  if (requestedLimit === undefined || requestedLimit === null || Number.isNaN(requestedLimit)) {
    return SUPABASE_QUERY_LIMITS.DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(SUPABASE_QUERY_LIMITS.MAX_LIMIT, Math.floor(requestedLimit)));
}
