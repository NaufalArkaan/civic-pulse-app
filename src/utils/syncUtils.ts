/**
 * Civic Pulse - Pertemuan 11
 * Utilities: Offline Sync, Backoff, Idempotency & Payload Sanitization
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Design Principles:
 * 1. Pure computational logic: zero native bindings, fully deterministic & testable.
 * 2. Idempotency Key generation: RFC4122 v4 UUID.
 * 3. Exponential Backoff with Jitter: Mencegah thundering herd pada backend.
 * 4. Error Classification: Transient (5xx/network) vs Permanent (4xx/invalid payload).
 * 5. Sanitasi Payload: Redaction otomatis untuk field sensitif (token, password, nik).
 * 6. Conflict Resolution: Server-wins untuk synchronized reports, protect local drafts.
 */

import type { CachedCivicReport } from "../types/sync";

export const MAX_OUTBOX_RETRIES = 5;
export const BASE_BACKOFF_DELAY_MS = 1000;
export const MAX_BACKOFF_DELAY_MS = 60000;
export const DEFAULT_STALE_THRESHOLD_MS = 30000; // 30 detik

/**
 * Menghasilkan UUID v4 untuk operation_id (Idempotency Key).
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Menghitung jeda exponential backoff dengan full jitter.
 * delay = min(base * 2^retry + jitter, maxDelay)
 */
export function calculateBackoffDelay(
  retryCount: number,
  baseMs = BASE_BACKOFF_DELAY_MS,
  maxMs = MAX_BACKOFF_DELAY_MS
): number {
  const exponential = Math.min(baseMs * Math.pow(2, retryCount), maxMs);
  const jitter = Math.floor(Math.random() * (exponential * 0.2 + 200));
  return Math.min(exponential + jitter, maxMs);
}

/**
 * Memverifikasi dan membersihkan payload dari potensi kebocoran data sensitif.
 */
export function sanitizeOutboxPayload(rawPayload: string): string {
  try {
    const parsed = JSON.parse(rawPayload);
    const forbiddenKeys = ["token", "accessToken", "refreshToken", "password", "nik", "secret"];

    const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const clean: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (forbiddenKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
          continue; // Redact/Strip sensitive key
        }
        if (value && typeof value === "object" && !Array.isArray(value)) {
          clean[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
          clean[key] = value;
        }
      }
      return clean;
    };

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return JSON.stringify(sanitizeObject(parsed));
    }
    return rawPayload;
  } catch {
    return rawPayload;
  }
}

export type ErrorClassification = {
  isPermanent: boolean;
  action: "retry" | "failed_permanent";
  reason: string;
};

/**
 * Mengklasifikasikan error HTTP / jaringan menjadi Transient vs Permanent.
 */
export function classifySyncError(
  statusCode: number,
  currentRetryCount: number,
  customMessage?: string
): ErrorClassification {
  // 4xx Client Errors: Data payload rusak, unprocessable, atau unauthorized
  if (statusCode >= 400 && statusCode < 500) {
    return {
      isPermanent: true,
      action: "failed_permanent",
      reason: customMessage || `Permanent client error (${statusCode})`,
    };
  }

  const nextRetry = currentRetryCount + 1;
  if (nextRetry >= MAX_OUTBOX_RETRIES) {
    return {
      isPermanent: true,
      action: "failed_permanent",
      reason: `Max retries (${MAX_OUTBOX_RETRIES}) reached. ${customMessage || ""}`,
    };
  }

  // 5xx Server Error / 0 Network Disconnect: Transient, coba lagi nanti
  return {
    isPermanent: false,
    action: "retry",
    reason: customMessage || `Transient server error (${statusCode})`,
  };
}

/**
 * Melakukan rekonsiliasi data server terhadap cache lokal.
 * Prinsip:
 * 1. Server-wins untuk data yang sudah tersinkronisasi.
 * 2. Draft lokal yang belum tersinkronisasi (isLocalDraft = true) TIDAK BOLEH ditimpa.
 */
export function reconcileReports(
  localReports: CachedCivicReport[],
  serverReports: CachedCivicReport[],
  syncedTimestamp: string
): CachedCivicReport[] {
  const localDraftIds = new Set(
    localReports.filter((r) => r.isLocalDraft).map((r) => r.id)
  );

  const mergedMap = new Map<string, CachedCivicReport>();

  // Masukkan semua local draft terlebih dahulu
  for (const local of localReports) {
    if (local.isLocalDraft) {
      mergedMap.set(local.id, local);
    }
  }

  // Rekonsiliasi data dari server
  for (const server of serverReports) {
    // Jika ada ID yang sama dan masih merupakan local draft yang belum tersinkron, lindungi draft lokal
    if (localDraftIds.has(server.id)) {
      continue;
    }

    mergedMap.set(server.id, {
      ...server,
      isLocalDraft: false,
      syncedAt: syncedTimestamp,
    });
  }

  return Array.from(mergedMap.values());
}
