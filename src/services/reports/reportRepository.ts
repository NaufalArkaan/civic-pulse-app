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

export class ReportRepository {
  private syncStateSubject = new BehaviorSubject<SyncState>("idle");

  get syncState$(): Observable<SyncState> {
    return this.syncStateSubject.asObservable();
  }

  getSyncState(): SyncState {
    return this.syncStateSubject.value;
  }

  /**
   * Mengambil daftar laporan berdasarkan kriteria pencarian dan status jaringan
   */
  async getReports(criteria?: SearchCriteria): Promise<RepositoryResult<Report[]>> {
    try {
      const isOnline = networkService.getNetworkState().status === "online";
      const cached = await reportCacheRepository.queryReports(criteria);

      return {
        success: true,
        data: cached,
        error: null,
        isFromCache: !isOnline,
        staleTimestamp: !isOnline ? new Date().toISOString() : null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal memuat laporan.",
      };
    }
  }

  /**
   * Membuat laporan baru dengan dukungan offline outbox
   */
  async createReport(
    newReportData: Omit<Report, "id" | "createdAt" | "updatedAt">
  ): Promise<RepositoryResult<Report>> {
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const idempotencyKey = `idemp_${reportId}`;

    const report: Report = {
      ...newReportData,
      id: reportId,
      createdAt: now,
      updatedAt: now,
    };

    const isOnline = networkService.getNetworkState().status === "online";

    if (isOnline) {
      // 1. Jalur Online: Simpan ke cache dan pancarkan event realtime
      await reportCacheRepository.upsertReport(report);
      mockRealtimeProvider.emitSimulatedEvent("INSERT", report);

      return {
        success: true,
        data: report,
        error: null,
        isFromCache: false,
      };
    } else {
      // 2. Jalur Offline: Simpan ke cache lokal dan masukkan ke Outbox Queue
      await reportCacheRepository.upsertReport(report);
      await outboxRepository.enqueueOperation("CREATE_REPORT", report, idempotencyKey);

      this.syncStateSubject.next("pending");

      return {
        success: true,
        data: report,
        error: null,
        isFromCache: true, // Beri label bahwa data tersimpan di outbox lokal
      };
    }
  }

  /**
   * Memperbarui status laporan (misal: verifikasi oleh petugas)
   */
  async updateReportStatus(
    reportId: string,
    newStatus: ReportStatus
  ): Promise<RepositoryResult<Report>> {
    const existing = await reportCacheRepository.getReportById(reportId);
    if (!existing) {
      return {
        success: false,
        data: null,
        error: "Laporan tidak ditemukan di cache lokal.",
      };
    }

    const updated: Report = {
      ...existing,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    const isOnline = networkService.getNetworkState().status === "online";

    if (isOnline) {
      await reportCacheRepository.upsertReport(updated);
      mockRealtimeProvider.emitSimulatedEvent("UPDATE", updated);

      return {
        success: true,
        data: updated,
        error: null,
        isFromCache: false,
      };
    } else {
      await reportCacheRepository.upsertReport(updated);
      await outboxRepository.enqueueOperation(
        "UPDATE_STATUS",
        { id: reportId, status: newStatus },
        `idemp_status_${reportId}_${Date.now()}`
      );
      this.syncStateSubject.next("pending");

      return {
        success: true,
        data: updated,
        error: null,
        isFromCache: true,
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
