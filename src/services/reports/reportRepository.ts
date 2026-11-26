/**
 * Civic Pulse - Pertemuan 11–13
 * Repository: ReportRepository (Orkestrator Supabase PostgREST, SQLite Cache, Outbox & Realtime)
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 */

import { BehaviorSubject, Observable } from "rxjs";
import { Report, ReportStatus } from "../../types/report";
import { RepositoryResult, SyncState } from "../../types/sync";
import { SearchCriteria, normalizeQuery } from "../../types/search";
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
  // Menyimpan perubahan status/laporan lokal yang lebih baru agar tidak tertimpa fetch lama
  private localOverrides = new Map<string, Report>();

  get syncState$(): Observable<SyncState> {
    return this.syncStateSubject.asObservable();
  }

  getSyncState(): SyncState {
    return this.syncStateSubject.value;
  }

  /**
   * Menggabungkan hasil remote Supabase dengan perubahan lokal terbaru (Timestamp-Wins)
   * dan menerapkan filter kriteria pencarian secara konsisten.
   */
  private mergeAndFilterReports(remoteReports: Report[], criteria?: SearchCriteria): Report[] {
    const mergedMap = new Map<string, Report>();

    for (const remote of remoteReports) {
      const local = this.localOverrides.get(remote.id);
      if (
        local &&
        new Date(local.updatedAt).getTime() >= new Date(remote.updatedAt).getTime()
      ) {
        mergedMap.set(remote.id, local);
      } else {
        mergedMap.set(remote.id, remote);
      }
    }

    // Tambahkan laporan baru yang dibuat di lokal namun belum terindeks di halaman pertama remote
    for (const [id, local] of this.localOverrides.entries()) {
      if (!mergedMap.has(id) && !local.deletedAt) {
        mergedMap.set(id, local);
      }
    }

    const norm = criteria ? normalizeQuery(criteria.query) : "";
    const category = criteria?.category && criteria.category !== "all" ? criteria.category : null;
    const status = criteria?.status && criteria.status !== "all" ? criteria.status : null;

    return Array.from(mergedMap.values())
      .filter((r) => {
        if (r.deletedAt) return false;
        if (category && r.category !== category) return false;
        if (status && r.status !== status) return false;
        if (norm) {
          const matchTitle = r.title.toLowerCase().includes(norm);
          const matchDesc = r.description.toLowerCase().includes(norm);
          return matchTitle || matchDesc;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Mengambil daftar laporan berdasarkan kriteria pencarian dan status jaringan.
   */
  async getReports(criteria?: SearchCriteria): Promise<RepositoryResult<Report[]>> {
    try {
      const isOnline = networkService.getNetworkState().status === "online";

      if (isOnline && supabaseRestClient.isReady()) {
        // Ambil semua laporan aktif lalu terapkan merge & filter agar perubahan status lokal selalu sinkron
        const remote = await supabaseRestClient.fetchReports();
        if (remote.data && !remote.error) {
          const mergedAll = this.mergeAndFilterReports(remote.data);
          await reportCacheRepository.upsertReports(mergedAll);

          const filtered = this.mergeAndFilterReports(remote.data, criteria);
          return {
            success: true,
            data: filtered,
            error: null,
            isFromCache: false,
            staleTimestamp: null,
          };
        }
      }

      const cached = await reportCacheRepository.queryReports(criteria);
      const mergedCached = this.mergeAndFilterReports(cached, criteria);

      return {
        success: true,
        data: mergedCached,
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
   * Membuat laporan baru dengan dukungan Supabase PostgREST & offline outbox
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
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    };

    this.localOverrides.set(report.id, report);
    await reportCacheRepository.upsertReport(report);

    const isOnline = networkService.getNetworkState().status === "online";

    if (isOnline) {
      if (supabaseRestClient.isReady()) {
        const remoteRes = await supabaseRestClient.upsertReportRemote(report, idempotencyKey);
        if (!remoteRes.confirmed) {
          await outboxRepository.enqueueOperation("CREATE_REPORT", report, idempotencyKey);
          this.syncStateSubject.next("pending");
          return {
            success: true,
            data: report,
            error: null,
            isFromCache: false,
            syncOutcome: "updated_local",
          };
        }

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
   * Memperbarui status laporan (Verifikasi -> Proses -> Selesai)
   */
  async updateReportStatus(
    reportId: string,
    newStatus: ReportStatus,
    actorRole: UserRole = "field_officer"
  ): Promise<MutationRepositoryResult<Report>> {
    let existing =
      this.localOverrides.get(reportId) ||
      (await reportCacheRepository.getReportById(reportId));

    if (!existing) {
      return {
        success: false,
        data: null,
        error: "Laporan tidak ditemukan di pangkalan data.",
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

    const now = new Date().toISOString();
    const updated: Report = {
      ...existing,
      status: newStatus,
      updatedAt: now,
    };

    // 1. Simpan segera ke localOverrides & SQLite Cache agar UI langsung berubah secara deterministik
    this.localOverrides.set(reportId, updated);
    await reportCacheRepository.upsertReport(updated);

    const idempotencyKey = `idemp_status_${reportId}_${newStatus}_${Date.now()}`;
    const isOnline = networkService.getNetworkState().status === "online";

    if (isOnline) {
      if (supabaseRestClient.isReady()) {
        const remoteRes = await supabaseRestClient.updateReportStatusRemote(
          reportId,
          newStatus,
          now
        );

        if (remoteRes.confirmed) {
          return {
            success: true,
            data: updated,
            error: null,
            isFromCache: false,
            syncOutcome: "confirmed_remote",
          };
        }

        // Jika belum terkonfirmasi di remote (misal policy RLS lama), tetap simpan perubahan di aplikasi
        await outboxRepository.enqueueOperation(
          "UPDATE_STATUS",
          { id: reportId, status: newStatus, updatedAt: now },
          idempotencyKey
        );
        return {
          success: true,
          data: updated,
          error: null,
          isFromCache: false,
          syncOutcome: "updated_local",
        };
      }

      return {
        success: true,
        data: updated,
        error: null,
        isFromCache: false,
        syncOutcome: "updated_local",
      };
    } else {
      await outboxRepository.enqueueOperation(
        "UPDATE_STATUS",
        { id: reportId, status: newStatus, updatedAt: now },
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
    const existing =
      this.localOverrides.get(reportId) ||
      (await reportCacheRepository.getReportById(reportId));

    if (!existing) {
      return {
        success: false,
        data: null,
        error: "Laporan tidak ditemukan.",
      };
    }

    const deletedReport: Report = {
      ...existing,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.localOverrides.set(reportId, deletedReport);
    await reportCacheRepository.deleteReport(reportId);

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

        if (op.type === "CREATE_REPORT" || op.operation_type === "CREATE_REPORT") {
          if (supabaseRestClient.isReady()) {
            await supabaseRestClient.upsertReportRemote(
              op.payload,
              op.idempotencyKey || `idemp_${opId}`
            );
          }
        } else if (op.type === "UPDATE_STATUS" || op.operation_type === "UPDATE_STATUS") {
          if (supabaseRestClient.isReady() && op.payload?.id && op.payload?.status) {
            await supabaseRestClient.updateReportStatusRemote(
              op.payload.id,
              op.payload.status,
              op.payload.updatedAt || new Date().toISOString()
            );
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
