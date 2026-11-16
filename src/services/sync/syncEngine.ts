/**
 * Civic Pulse - Pertemuan 11
 * Service: SyncEngine (Orchestrator for Offline-First Reconciliation & Outbox Flush)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Responsibilities:
 * 1. Menghubungkan NetworkStateService, LocalReportStore, dan OutboxRepository.
 * 2. Menjalankan sinkronisasi secara deterministik di foreground dan oportunistik di background.
 * 3. Flush Outbox Queue dengan Idempotency Key (operation_id), Exponential Backoff, dan Jitter.
 * 4. Error classification: Membedakan transient failure (retry) vs permanent failure (4xx).
 * 5. Reconcile conflict resolution: Server-timestamp-wins untuk data publik,
 *    namun menjaga draft lokal yang belum tersinkronisasi agar tidak tertimpa.
 * 6. Mencegah race condition dengan sync mutex (isSyncing flag).
 */

import { NetworkStateService, networkStateService } from "../network/networkStateService";
import { LocalReportStore, localReportStore } from "../database/localReportStore";
import { OutboxRepository, outboxRepository } from "./outboxRepository";
import { CachedCivicReport, OutboxOperation, SyncResult } from "../../types/sync";
import { classifySyncError, reconcileReports } from "../../utils/syncUtils";

export type RemoteDispatchResponse = {
  status: number;
  data?: unknown;
  error?: string;
};

export interface IRemoteSyncDispatcher {
  dispatchOperation(operation: OutboxOperation): Promise<RemoteDispatchResponse>;
  fetchServerReports(sinceTimestamp?: string | null): Promise<{ status: number; reports: CachedCivicReport[] }>;
}

/**
 * Default Mock / Local Dispatcher:
 * Mensimulasikan round-trip HTTP dengan validasi idempotency dan latency realistis.
 * Dapat dengan mudah diganti dengan Real HTTP REST/GraphQL API Client.
 */
export class DefaultRemoteDispatcher implements IRemoteSyncDispatcher {
  async dispatchOperation(operation: OutboxOperation): Promise<RemoteDispatchResponse> {
    // Simulasi latency jaringan 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Simulasi payload validation (misal bad request jika payload rusak)
    try {
      JSON.parse(operation.payload);
    } catch {
      return { status: 400, error: "Invalid JSON payload format" };
    }

    return {
      status: 200,
      data: {
        operation_id: operation.operation_id,
        entity_id: operation.entity_id,
        server_received_at: new Date().toISOString(),
      },
    };
  }

  async fetchServerReports(_sinceTimestamp?: string | null): Promise<{ status: number; reports: CachedCivicReport[] }> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      status: 200,
      reports: [],
    };
  }
}

export class SyncEngine {
  private isSyncing = false;
  private networkService: NetworkStateService;
  private reportStore: LocalReportStore;
  private outboxRepo: OutboxRepository;
  private dispatcher: IRemoteSyncDispatcher;

  constructor(
    networkService: NetworkStateService = networkStateService,
    reportStore: LocalReportStore = localReportStore,
    outboxRepo: OutboxRepository = outboxRepository,
    dispatcher: IRemoteSyncDispatcher = new DefaultRemoteDispatcher()
  ) {
    this.networkService = networkService;
    this.reportStore = reportStore;
    this.outboxRepo = outboxRepo;
    this.dispatcher = dispatcher;
  }

  /**
   * Menetapkan custom remote dispatcher (berguna untuk testing atau menghubungkan backend nyata)
   */
  setDispatcher(newDispatcher: IRemoteSyncDispatcher): void {
    this.dispatcher = newDispatcher;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Menambahkan laporan baru dalam mode offline-first:
   * 1. Simpan langsung ke SQLite lokal sebagai draft lokal (isLocalDraft = true).
   * 2. Daftarkan operasi CREATE_REPORT ke antrean Outbox.
   * 3. Jika sedang online, picu sinkronisasi segera di latar belakang.
   */
  async addReportOffline(
    reportData: Omit<CachedCivicReport, "syncedAt" | "isLocalDraft" | "version">
  ): Promise<CachedCivicReport> {
    const cachedReport: CachedCivicReport = {
      ...reportData,
      syncedAt: null,
      isLocalDraft: true,
      version: 1,
    };

    // 1. Simpan ke cache lokal agar langsung terlihat di UI
    await this.reportStore.upsertReports([cachedReport]);

    // 2. Masukkan ke Outbox Queue dengan operation_id unik
    await this.outboxRepo.enqueueOperation({
      entity_type: "report",
      entity_id: cachedReport.id,
      operation_type: "CREATE_REPORT",
      payload: JSON.stringify(cachedReport),
    });

    // 3. Opportunistic sync jika jaringan siap
    const netState = this.networkService.getState();
    if (netState.status === "online") {
      void this.syncAll();
    }

    return cachedReport;
  }

  /**
   * Sinkronisasi menyeluruh:
   * 1. Validasi reachability jaringan.
   * 2. Re-claim stale lock outbox.
   * 3. Flush operasi outbox (FIFO) dengan Idempotency & Backoff.
   * 4. Reconcile data server (Server-wins, tapi preserve un-synced local drafts).
   */
  async syncAll(): Promise<SyncResult> {
    const startTime = new Date().toISOString();

    // 1. Guard: Cegah concurrent execution
    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ["Sync already in progress (locked)"],
        timestamp: startTime,
      };
    }

    // 2. Guard: Cek apakah jaringan terhubung dan backend dapat dijangkau
    const netState = this.networkService.getState();
    if (netState.status === "offline") {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ["Device is offline. Sync postponed."],
        timestamp: startTime,
      };
    }

    if (netState.status === "connected-no-internet") {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ["Backend server is currently unreachable. Sync postponed."],
        timestamp: startTime,
      };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // 3. Reset operasi yang menggantung akibat crash/terminasi sebelumnya
      await this.outboxRepo.resetStaleProcessing();

      // 4. Ambil batch operasi outbox yang berstatus pending dan siap dieksekusi
      const pendingOps = await this.outboxRepo.getPendingOperations(20);

      for (const op of pendingOps) {
        // Atomic lock status dari pending ke processing
        const locked = await this.outboxRepo.markProcessing(op.operation_id);
        if (!locked) {
          // Operasi ini telah diambil oleh proses lain
          continue;
        }

        try {
          // Kirim ke server dengan menyertakan Idempotency Key
          const response = await this.dispatcher.dispatchOperation(op);

          if (response.status >= 200 && response.status < 300) {
            // Berhasil
            await this.outboxRepo.markSynced(op.operation_id);
            syncedCount++;

            // Update status di cache lokal
            if ((op.operation_type === "CREATE_REPORT" || op.operation_type === "UPDATE_REPORT") && op.entity_id) {
              const currentReport = await this.reportStore.getReportById(op.entity_id);
              if (currentReport) {
                await this.reportStore.upsertReports([
                  {
                    ...currentReport,
                    isLocalDraft: false,
                    syncedAt: new Date().toISOString(),
                  },
                ]);
              }
            } else if (op.operation_type === "DELETE_REPORT" && op.entity_id) {
              await this.reportStore.deleteReport(op.entity_id);
            }
          } else {
            const classification = classifySyncError(response.status, op.retry_count, response.error);
            await this.outboxRepo.markFailed(op.operation_id, classification.reason, classification.isPermanent);
            failedCount++;
            errors.push(`Op ${op.operation_id} ${classification.action}: ${classification.reason}`);
          }
        } catch (dispatchErr) {
          // Network exception / Timeout -> transient error
          const errMsg = dispatchErr instanceof Error ? dispatchErr.message : "Network dispatch failed";
          const classification = classifySyncError(0, op.retry_count, errMsg);
          await this.outboxRepo.markFailed(op.operation_id, classification.reason, classification.isPermanent);
          failedCount++;
          errors.push(`Op ${op.operation_id} exception: ${classification.reason}`);
        }
      }

      // 5. Reconcile Server Data (Pull & Conflict Resolution)
      try {
        const lastSync = await this.reportStore.getLastSyncTimestamp();
        const serverFetch = await this.dispatcher.fetchServerReports(lastSync);

        if (serverFetch.status >= 200 && serverFetch.status < 300 && serverFetch.reports.length > 0) {
          const localReports = await this.reportStore.getCachedReports();
          const reconciled = reconcileReports(localReports, serverFetch.reports, new Date().toISOString());
          await this.reportStore.upsertReports(reconciled);
        }

        await this.reportStore.setLastSyncTimestamp(new Date().toISOString());
      } catch (pullErr) {
        // Pull failure does not invalidate successfully pushed outbox items
        const pullErrMsg = pullErr instanceof Error ? pullErr.message : "Pull reconciliation failed";
        errors.push(`Pull reconciliation error: ${pullErrMsg}`);
      }

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        errors,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
