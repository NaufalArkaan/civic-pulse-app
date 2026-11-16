/**
 * Civic Pulse - Pertemuan 11
 * Repository: Offline Outbox Queue & Idempotency Store
 * Role: Anggota 1 & Anggota 3 (Robi) Integration Baseline
 *
 * Security & Idempotency Guards:
 * 1. Setiap operasi tulis memiliki idempotencyKey unik untuk mencegah duplikasi di server.
 * 2. Tidak menyimpan token/kredensial ke payload outbox.
 * 3. Menandai status 'processing' untuk mencegah pengiriman konkuren ganda.
 */

import { OutboxOperation, OutboxOperationType } from "../../types/sync";
import { getDatabase } from "./sqliteDatabase";

// In-memory fallback untuk outbox
const memoryOutbox: Map<string, OutboxOperation> = new Map();

export class OutboxRepository {
  /**
   * Menambahkan operasi tulis ke antrean outbox dengan idempotency key
   */
  async enqueueOperation<T = any>(
    type: OutboxOperationType,
    payload: T,
    idempotencyKey: string
  ): Promise<OutboxOperation<T>> {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const op: OutboxOperation<T> = {
      operationId,
      idempotencyKey,
      type,
      payload,
      status: "pending",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    memoryOutbox.set(operationId, op);

    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO outbox_operations (
          operation_id, idempotency_key, type, payload,
          status, retry_count, error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          op.operationId,
          op.idempotencyKey,
          op.type,
          JSON.stringify(op.payload),
          op.status,
          op.retryCount,
          null,
          op.createdAt,
          op.updatedAt,
        ]
      );
    } catch {
      // Memory fallback handles the op
    }

    return op;
  }

  /**
   * Mengambil seluruh operasi yang berstatus pending untuk diproses worker
   */
  async getPendingOperations(): Promise<OutboxOperation[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        "SELECT * FROM outbox_operations WHERE status = 'pending' ORDER BY created_at ASC;"
      );

      if (rows.length > 0) {
        return rows.map((r) => ({
          operationId: r.operation_id,
          idempotencyKey: r.idempotency_key,
          type: r.type as OutboxOperationType,
          payload: JSON.parse(r.payload),
          status: r.status,
          retryCount: r.retry_count,
          error: r.error,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      // Fallback
    }

    return Array.from(memoryOutbox.values())
      .filter((o) => o.status === "pending")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Menandai operasi sedang diproses
   */
  async markProcessing(operationId: string): Promise<void> {
    const op = memoryOutbox.get(operationId);
    if (op) {
      op.status = "processing";
      op.updatedAt = new Date().toISOString();
      memoryOutbox.set(operationId, op);
    }

    try {
      const db = await getDatabase();
      await db.runAsync(
        "UPDATE outbox_operations SET status = 'processing', updated_at = ? WHERE operation_id = ?;",
        [new Date().toISOString(), operationId]
      );
    } catch {
      // Fallback
    }
  }

  /**
   * Menandai operasi berhasil disinkronkan ke server
   */
  async markSynced(operationId: string): Promise<void> {
    const op = memoryOutbox.get(operationId);
    if (op) {
      op.status = "synced";
      op.updatedAt = new Date().toISOString();
      memoryOutbox.set(operationId, op);
    }

    try {
      const db = await getDatabase();
      await db.runAsync(
        "UPDATE outbox_operations SET status = 'synced', updated_at = ? WHERE operation_id = ?;",
        [new Date().toISOString(), operationId]
      );
    } catch {
      // Fallback
    }
  }

  /**
   * Menandai operasi gagal (sementara atau permanen)
   */
  async markFailed(
    operationId: string,
    error: string,
    isPermanent = false
  ): Promise<void> {
    const now = new Date().toISOString();
    const op = memoryOutbox.get(operationId);
    if (op) {
      op.status = isPermanent ? "failed_permanent" : "pending";
      op.retryCount += 1;
      op.error = error;
      op.updatedAt = now;
      memoryOutbox.set(operationId, op);
    }

    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE outbox_operations SET
          status = ?,
          retry_count = retry_count + 1,
          error = ?,
          updated_at = ?
        WHERE operation_id = ?;`,
        [isPermanent ? "failed_permanent" : "pending", error, now, operationId]
      );
    } catch {
      // Fallback
    }
  }
}

export const outboxRepository = new OutboxRepository();
