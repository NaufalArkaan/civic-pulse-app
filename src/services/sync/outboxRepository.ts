/**
 * Civic Pulse - Pertemuan 11
 * Service: OutboxRepository (Persistent SQLite Outbox for Offline Writes)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Core Principles:
 * 1. Idempotency Key: Setiap operasi memiliki operation_id unik (UUID).
 * 2. Concurrency Lock: Menggunakan atomic status update ('pending' -> 'processing')
 *    untuk mencegah double-execution saat concurrent sync (foreground vs background).
 * 3. Exponential Backoff + Jitter: Mencegah thundering herd pada backend.
 * 4. Stale Lock Recovery: Me-reset status 'processing' jika aplikasi terhenti di tengah jalan.
 * 5. Sanitasi Payload: Menolak penyimpanan token / NIK / kredensial dalam payload outbox.
 */

import type { EnqueueOperationInput, IOutboxRepository, OutboxOperation, OutboxStatus } from "../../types/sync";
import { DatabaseManager, databaseManager } from "../database/database";
import {
  BASE_BACKOFF_DELAY_MS,
  calculateBackoffDelay,
  DEFAULT_STALE_THRESHOLD_MS,
  generateUUID,
  MAX_BACKOFF_DELAY_MS,
  MAX_OUTBOX_RETRIES,
  sanitizeOutboxPayload,
} from "../../utils/syncUtils";

export {
  BASE_BACKOFF_DELAY_MS,
  calculateBackoffDelay,
  DEFAULT_STALE_THRESHOLD_MS,
  generateUUID,
  MAX_BACKOFF_DELAY_MS,
  MAX_OUTBOX_RETRIES,
  sanitizeOutboxPayload,
};

type SQLiteOutboxRow = {
  operation_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  payload: string;
  created_at: string;
  retry_count: number;
  next_attempt_at: string;
  status: string;
  last_error: string | null;
};

export class OutboxRepository implements IOutboxRepository {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager = databaseManager) {
    this.dbManager = dbManager;
  }

  async enqueueOperation(operation: EnqueueOperationInput): Promise<OutboxOperation> {
    const db = await this.dbManager.getDatabase();
    const now = new Date().toISOString();
    const operation_id = operation.operation_id || generateUUID();
    const sanitizedPayload = sanitizeOutboxPayload(operation.payload);

    const opType = operation.operation_type || operation.type || "CREATE_REPORT";
    const fullOp: OutboxOperation = {
      operation_id,
      operationId: operation_id,
      idempotencyKey: operation.idempotencyKey || operation_id,
      entity_type: operation.entity_type,
      entity_id: operation.entity_id,
      operation_type: opType,
      type: opType,
      payload: sanitizedPayload,
      created_at: now,
      createdAt: now,
      retry_count: 0,
      retryCount: 0,
      next_attempt_at: now,
      status: "pending",
      last_error: null,
      error: null,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO outbox_operations (
        operation_id, entity_type, entity_id, operation_type,
        payload, created_at, retry_count, next_attempt_at, status, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullOp.operation_id,
        fullOp.entity_type,
        fullOp.entity_id,
        fullOp.operation_type,
        fullOp.payload,
        fullOp.created_at,
        fullOp.retry_count,
        fullOp.next_attempt_at,
        fullOp.status,
        fullOp.last_error,
      ]
    );

    return fullOp;
  }

  async getPendingOperations(limit = 20): Promise<OutboxOperation[]> {
    const db = await this.dbManager.getDatabase();
    const now = new Date().toISOString();

    const rows = await db.getAllAsync<SQLiteOutboxRow>(
      `SELECT * FROM outbox_operations
       WHERE status = 'pending' AND next_attempt_at <= ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [now, limit]
    );

    return rows.map((row) => this.mapRowToOperation(row));
  }

  async markProcessing(operation_id: string): Promise<boolean> {
    const db = await this.dbManager.getDatabase();
    const result = await db.runAsync(
      `UPDATE outbox_operations
       SET status = 'processing'
       WHERE operation_id = ? AND status = 'pending'`,
      [operation_id]
    );

    // changes > 0 menandakan lock berhasil diakuisisi
    return result.changes > 0;
  }

  async markSynced(operation_id: string): Promise<void> {
    const db = await this.dbManager.getDatabase();
    await db.runAsync(
      `UPDATE outbox_operations
       SET status = 'synced', last_error = NULL
       WHERE operation_id = ?`,
      [operation_id]
    );
  }

  async markFailed(
    operation_id: string,
    error: string,
    isPermanent = false
  ): Promise<void> {
    const db = await this.dbManager.getDatabase();

    const current = await db.getFirstAsync<{ retry_count: number }>(
      "SELECT retry_count FROM outbox_operations WHERE operation_id = ?",
      [operation_id]
    );

    const newRetryCount = (current?.retry_count ?? 0) + 1;
    const shouldFailPermanently = isPermanent || newRetryCount >= MAX_OUTBOX_RETRIES;

    if (shouldFailPermanently) {
      await db.runAsync(
        `UPDATE outbox_operations
         SET status = 'failed_permanent', retry_count = ?, last_error = ?
         WHERE operation_id = ?`,
        [newRetryCount, error, operation_id]
      );
    } else {
      const delayMs = calculateBackoffDelay(newRetryCount);
      const nextAttemptAt = new Date(Date.now() + delayMs).toISOString();

      await db.runAsync(
        `UPDATE outbox_operations
         SET status = 'pending', retry_count = ?, next_attempt_at = ?, last_error = ?
         WHERE operation_id = ?`,
        [newRetryCount, nextAttemptAt, error, operation_id]
      );
    }
  }

  async resetStaleProcessing(staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS): Promise<number> {
    const db = await this.dbManager.getDatabase();
    const staleTime = new Date(Date.now() - staleThresholdMs).toISOString();

    const result = await db.runAsync(
      `UPDATE outbox_operations
       SET status = 'pending'
       WHERE status = 'processing' AND next_attempt_at <= ?`,
      [staleTime]
    );

    return result.changes;
  }

  async getPendingCount(): Promise<number> {
    const db = await this.dbManager.getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM outbox_operations WHERE status IN ('pending', 'processing')"
    );
    return result?.count ?? 0;
  }

  async getAllOperations(limit = 100): Promise<OutboxOperation[]> {
    const db = await this.dbManager.getDatabase();
    const rows = await db.getAllAsync<SQLiteOutboxRow>(
      "SELECT * FROM outbox_operations ORDER BY created_at DESC LIMIT ?",
      [limit]
    );
    return rows.map((row) => this.mapRowToOperation(row));
  }

  private mapRowToOperation(row: SQLiteOutboxRow): OutboxOperation {
    const opType = (row.operation_type || "CREATE_REPORT") as OutboxOperation["operation_type"];
    return {
      operation_id: row.operation_id,
      operationId: row.operation_id,
      idempotencyKey: row.operation_id,
      entity_type: row.entity_type as "report",
      entity_id: row.entity_id,
      operation_type: opType,
      type: opType,
      payload: row.payload,
      created_at: row.created_at,
      createdAt: row.created_at,
      retry_count: row.retry_count,
      retryCount: row.retry_count,
      next_attempt_at: row.next_attempt_at,
      status: row.status as OutboxStatus,
      last_error: row.last_error,
      error: row.last_error,
      updatedAt: row.created_at,
    };
  }
}

export const outboxRepository = new OutboxRepository();
