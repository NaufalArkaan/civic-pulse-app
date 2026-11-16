/**
 * Civic Pulse - Pertemuan 11
 * Architectural Contract: Network State, Outbox Queue & Synchronization
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 */

export type NetworkStatusType = "online" | "offline" | "reconnecting";

export type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  status: NetworkStatusType;
  type: string | null;
};

export type SyncState = "idle" | "pending" | "syncing" | "synced" | "failed";

export type OutboxOperationType = "CREATE_REPORT" | "UPDATE_STATUS";

export type OutboxOperationStatus =
  | "pending"
  | "processing"
  | "synced"
  | "failed_permanent";

export type OutboxOperation<T = any> = {
  operationId: string;
  idempotencyKey: string;
  type: OutboxOperationType;
  payload: T;
  status: OutboxOperationStatus;
  retryCount: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RepositoryResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  isFromCache?: boolean;
  staleTimestamp?: string | null;
};
