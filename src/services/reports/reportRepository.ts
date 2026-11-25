/**
 * Civic Pulse - Pertemuan 11
 * Repository: ReportRepository (Orkestrator Cache, Outbox, Search & Realtime)
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 */

import { BehaviorSubject, Observable } from "rxjs";
import { Report, ReportStatus } from "../../types/report";
import { RepositoryResult, SyncState } from "../../types/sync";
import { SearchCriteria } from "../../types/search";
import { reportCacheRepository } from "../database/reportCacheRepository";
import { outboxRepository } from "../database/outboxRepository";
import { networkService } from "../network/networkService";
import { mockRealtimeProvider } from "../../providers/realtime/MockRealtimeProvider";
import {
  supabaseRestClient,
  validateStatusTransition,
  UserRole,
} from "../supabase/supabaseClient";
import { classifyAppError } from "../../utils/errorTaxonomy";

export type MutationSyncOutcome = "confirmed_remote" | "queued_offline" | "updated_local";

export type MutationRepositoryResult<T> = RepositoryResult<T> & {
  syncOutcome?: MutationSyncOutcome;
};

export class ReportRepository {
  private syncStateSubject = new BehaviorSubject<SyncState>("idle");

  get syncState$(): Observable<SyncState> {
    return this.syncStateSubject.asObservable();
  }

  getSyncState(): SyncState {
    return this.syncStateSubject.value;
  }

  /**
   * Mengambil daftar laporan berdasarkan kriteria pencarian dan status jaringan.
   * Prioritas:
   * 1. Jika online & Supabase PostgREST siap: tarik dari Supabase, perbarui cache SQLite.
   * 2. Jika gagal atau offline: kembalikan data dari cache SQLite secara jujur (isFromCache: true).
   */
  async getReports(criteria?: SearchCriteria): Promise<RepositoryResult<Report[]>> {
    try {
      const isOnline = networkService.getNetworkState().status === "online";

      if (isOnline && supabaseRestClient.isReady()) {
        const remote = await supabaseRestClient.fetchReports(criteria);
        if (remote.data && !remote.error) {
          await reportCacheRepository.upsertReports(remote.data);
          return {
            success: true,
            data: remote.data,
            error: null,
            isFromCache: false,
            staleTimestamp: null,
          };
        }
      }

      const cached = await reportCacheRepository.queryReports(criteria);

      return {
        success: true,
        data: cached,
        error: null,
        isFromCache: !isOnline || !supabaseRestClient.isReady(),
        staleTimestamp: !isOnline ? new Date().toISOString() : null,
      };
    } catch (err: unknown) {
      const classified = classifyAppError(err);
      return {
        success: false,
        data: null,
        error: classified.userMessage,
      };
    }
  }

  /**
   * Membuat laporan baru dengan dukungan offline outbox & konfirmasi server jujur
   */
  async createReport(
    newReportData: Omit<Report, "id" | "createdAt" | "updatedAt">
  ): Promise<MutationRepositoryResult<Report>> {
    if (!newReportData.title || newReportData.title.trim().length < 5) {
      return {
        success: false,
        data: null,
        error: "Judul laporan minimal harus 5 karakter.",
      };
    }

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const idempotencyKey = `idemp_${reportId}`;

    const report: Report = {
      ...newReportData,
      id: reportId,
      status: "submitted", // Authoritative initial status
      createdAt: now,
      updatedAt: now,
    };

    const isOnline = networkService.getNetworkState().status === "online";

    if (isOnline) {
      await reportCacheRepository.upsertReport(report);

      if (supabaseRestClient.isReady()) {
        const remoteRes = await supabaseRestClient.upsertReportRemote(report, idempotencyKey);
        if (!remoteRes.confirmed) {
          await outboxRepository.enqueueOperation("CREATE_REPORT", report, idempotencyKey);
          this.syncStateSubject.next("pending");
          return {
            success: true,
            data: report,
            error: remoteRes.error?.userMessage ?? null,
            isFromCache: true,
            syncOutcome: "queued_offline",
          };
        }

        mockRealtimeProvider.emitSimulatedEvent("INSERT", report);
        return {
          success: true,
          data: report,
          error: null,
          isFromCache: false,
          syncOutcome: "confirmed_remote",
        };
      }

      mockRealtimeProvider.emitSimulatedEvent("INSERT", report);
      return {
        success: true,
        data: report,
        error: null,
        isFromCache: false,
        syncOutcome: "updated_local",
      };
    } else {
      // Jalur Offline: Simpan ke cache lokal dan masukkan ke Outbox Queue
      await reportCacheRepository.upsertReport(report);
      await outboxRepository.enqueueOperation("CREATE_REPORT", report, idempotencyKey);

      this.syncStateSubject.next("pending");

      return {
        success: true,
        data: report,
        error: null,
        isFromCache: true,
        syncOutcome: "queued_offline",
      };
    }
  }

  /**
   * Memperbarui status laporan dengan validasi Authoritative State Machine & Role
   */
  async updateReportStatus(
    reportId: string,
    newStatus: ReportStatus,
    actorRole: UserRole = "field_officer"
  ): Promise<MutationRepositoryResult<Report>> {
    const existing = await reportCacheRepository.getReportById(reportId);
    if (!existing) {
      return {
        success: false,
        data: null,
        error: "Laporan tidak ditemukan di pangkalan data lokal.",
      };
    }

    // Validasi otoritatif transisi status
    const transitionCheck = validateStatusTransition(existing.status, newStatus, actorRole);
    if (!transitionCheck.valid) {
      return {
        success: false,
        data: null,
        error: transitionCheck.reason,
      };
    }

    const updated: Report = {
      ...existing,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    const idempotencyKey = `idemp_status_${reportId}_${newStatus}`;
    const isOnline = networkService.getNetworkState().status === "online";

    if (isOnline) {
      await reportCacheRepository.upsertReport(updated);

      if (supabaseRestClient.isReady()) {
        const remoteRes = await supabaseRestClient.upsertReportRemote(updated, idempotencyKey);
        if (!remoteRes.confirmed) {
          await outboxRepository.enqueueOperation(
            "UPDATE_STATUS",
            { id: reportId, status: newStatus },
            idempotencyKey
          );
          this.syncStateSubject.next("pending");
          return {
            success: true,
            data: updated,
            error: remoteRes.error?.userMessage ?? null,
            isFromCache: true,
            syncOutcome: "queued_offline",
          };
        }

        mockRealtimeProvider.emitSimulatedEvent("UPDATE", updated);
        return {
          success: true,
          data: updated,
          error: null,
          isFromCache: false,
          syncOutcome: "confirmed_remote",
        };
      }

      mockRealtimeProvider.emitSimulatedEvent("UPDATE", updated);
      return {
        success: true,
        data: updated,
        error: null,
        isFromCache: false,
        syncOutcome: "updated_local",
      };
    } else {
      await reportCacheRepository.upsertReport(updated);
      await outboxRepository.enqueueOperation(
        "UPDATE_STATUS",
        { id: reportId, status: newStatus },
        idempotencyKey
      );
      this.syncStateSubject.next("pending");

      return {
        success: true,
        data: updated,
        error: null,
        isFromCache: true,
        syncOutcome: "queued_offline",
      };
    }
  }

  /**
   * Menghapus laporan (soft delete)
   */
  async deleteReport(reportId: string): Promise<RepositoryResult<void>> {
    const existing = await reportCacheRepository.getReportById(reportId);
    if (!existing) {
      return {
        success: false,
        data: null,
        error: "Laporan tidak ditemukan.",
      };
    }

    await reportCacheRepository.deleteReport(reportId);
    mockRealtimeProvider.emitSimulatedEvent("DELETE", existing);

    return {
      success: true,
      data: null,
      error: null,
    };
  }

  /**
   * Mengirim seluruh operasi outbox yang tertunda saat koneksi pulih
   */
  async processOutbox(): Promise<number> {
    const isOnline = networkService.getNetworkState().status === "online";
    if (!isOnline) {
      return 0;
    }

    const pending = await outboxRepository.getPendingOperations();
    if (pending.length === 0) {
      this.syncStateSubject.next("synced");
      return 0;
    }

    this.syncStateSubject.next("syncing");
    let syncedCount = 0;

    for (const op of pending) {
      const opId = op.operationId || op.operation_id || "";
      try {
        await outboxRepository.markProcessing(opId);

        // Simulasi pengiriman ke server menggunakan idempotency key
        if (op.type === "CREATE_REPORT" || op.operation_type === "CREATE_REPORT") {
          mockRealtimeProvider.emitSimulatedEvent("INSERT", op.payload);
        } else if (op.type === "UPDATE_STATUS" || op.operation_type === "UPDATE_STATUS") {
          const report = await reportCacheRepository.getReportById(op.payload.id);
          if (report) {
            mockRealtimeProvider.emitSimulatedEvent("UPDATE", report);
          }
        }

        await outboxRepository.markSynced(opId);
        syncedCount += 1;
      } catch (err: any) {
        await outboxRepository.markFailed(opId, err?.message || "Sinkronisasi gagal");
      }
    }

    const remaining = await outboxRepository.getPendingOperations();
    this.syncStateSubject.next(remaining.length === 0 ? "synced" : "failed");

    return syncedCount;
  }
}

export const reportRepository = new ReportRepository();
