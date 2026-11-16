/**
 * Civic Pulse - Pertemuan 11
 * Architectural Contract: Local SQLite Cache, Outbox Queue & Sync Engine Types
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 */

import type { CivicReportCategory, CivicReportSeverity } from "./report";

export type OutboxOperationType = "CREATE_REPORT" | "UPDATE_REPORT" | "DELETE_REPORT";

export type OutboxStatus = "pending" | "processing" | "synced" | "failed_permanent";

export type OutboxOperation = {
  operation_id: string; // UUID / Idempotency Key unik
  entity_type: "report";
  entity_id: string;
  operation_type: OutboxOperationType;
  payload: string; // Serialized JSON payload (bebas token/rahasia)
  created_at: string;
  retry_count: number;
  next_attempt_at: string;
  status: OutboxStatus;
  last_error: string | null;
};

export type CachedCivicReport = {
  id: string;
  title: string;
  category: CivicReportCategory;
  description: string;
  latitude: number;
  longitude: number;
  severity: CivicReportSeverity;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  isLocalDraft: boolean;
  version: number;
};

export type SyncResult = {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
  timestamp: string;
};

export interface ILocalReportStore {
  initialize(): Promise<void>;
  upsertReports(reports: CachedCivicReport[]): Promise<void>;
  getCachedReports(): Promise<CachedCivicReport[]>;
  getReportById(id: string): Promise<CachedCivicReport | null>;
  deleteReport(id: string): Promise<void>;
  getLastSyncTimestamp(): Promise<string | null>;
  clearCache(): Promise<void>;
}

export interface IOutboxRepository {
  enqueueOperation(
    operation: Omit<OutboxOperation, "operation_id" | "retry_count" | "status" | "last_error" | "created_at" | "next_attempt_at"> & {
      operation_id?: string;
    }
  ): Promise<OutboxOperation>;
  getPendingOperations(limit?: number): Promise<OutboxOperation[]>;
  markProcessing(operation_id: string): Promise<boolean>;
  markSynced(operation_id: string): Promise<void>;
  markFailed(operation_id: string, error: string, isPermanent?: boolean): Promise<void>;
  resetStaleProcessing(staleThresholdMs?: number): Promise<number>;
  getPendingCount(): Promise<number>;
}
