/**
 * Civic Pulse - Pertemuan 10
 * Architectural Contract: Just-In-Time Runtime Permission Types
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

export type RuntimePermissionType = "camera" | "location" | "media";

export type RuntimePermissionStatus =
  | "not-requested"
  | "granted"
  | "denied"
  | "unavailable"
  | "needs-settings";

export type PermissionCheckResult = {
  status: RuntimePermissionStatus;
  canAskAgain: boolean;
  message?: string;
};
