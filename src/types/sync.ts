/**
 * Civic Pulse - Pertemuan 11
 * Architectural Contract: Local SQLite Cache, Outbox Queue & Synchronization
 * Co-authored by: Anggota 1 (Naufal) & Anggota 3 (Robi)
 */

import type { CivicReportCategory, CivicReportSeverity } from "./report";
export type { NetworkState } from "./network";

export type NetworkStatusType = "online" | "offline" | "reconnecting";

export type SyncState = "idle" | "pending" | "syncing" | "synced" | "failed";

export type OutboxOperationType =
  | "CREATE_REPORT"
  | "UPDATE_REPORT"
  | "DELETE_REPORT"
  | "UPDATE_STATUS";

export type OutboxOperationStatus =
  | "pending"
  | "processing"
  | "synced"
  | "failed_permanent";

export type OutboxStatus = OutboxOperationStatus;

export type OutboxOperation<T = any> = {
  operation_id: string;
  operationId?: string;
  entity_type?: "report";
  entity_id?: string;
  idempotencyKey?: string;
  operation_type?: OutboxOperationType;
  type?: OutboxOperationType;
  payload: T;
  created_at: string;
  createdAt?: string;
  retry_count: number;
  retryCount?: number;
  next_attempt_at: string;
  status: OutboxOperationStatus;
  last_error: string | null;
  error?: string | null;
  updatedAt?: string;
};

export type EnqueueOperationInput = {
  operation_id?: string;
  operationId?: string;
  entity_type?: "report";
  entity_id?: string;
  idempotencyKey?: string;
  operation_type?: OutboxOperationType;
  type?: OutboxOperationType;
  payload: string;
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

export type RepositoryResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  isFromCache?: boolean;
  staleTimestamp?: string | null;
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
  enqueueOperation(operation: EnqueueOperationInput): Promise<OutboxOperation>;
  getPendingOperations(limit?: number): Promise<OutboxOperation[]>;
  markProcessing(operation_id: string): Promise<boolean | void>;
  markSynced(operation_id: string): Promise<void>;
  markFailed(operation_id: string, error: string, isPermanent?: boolean): Promise<void>;
  resetStaleProcessing?(staleThresholdMs?: number): Promise<number>;
  getPendingCount?(): Promise<number>;
}
