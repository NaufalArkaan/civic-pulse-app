/**
 * Civic Pulse - Pertemuan 10
 * Architectural Contract: SecureStore Types & Keys
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

export const SECURE_STORAGE_KEYS = {
  AUTH_TOKEN: "civic_pulse.auth.token",
  USER_NIK: "civic_pulse.user.nik",
  CITIZEN_CREDENTIAL: "civic_pulse.auth.credential",
} as const;

export type SecureStorageKey =
  (typeof SECURE_STORAGE_KEYS)[keyof typeof SECURE_STORAGE_KEYS] | (string & {});

export type SecureStorageResult<T = string> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export interface ISecureStorageService {
  isAvailable(): Promise<boolean>;
  setSensitiveItem(key: SecureStorageKey, value: string): Promise<SecureStorageResult<void>>;
  getSensitiveItem(key: SecureStorageKey): Promise<SecureStorageResult<string>>;
  deleteSensitiveItem(key: SecureStorageKey): Promise<SecureStorageResult<void>>;
}
