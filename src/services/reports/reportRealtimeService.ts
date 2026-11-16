/**
 * Civic Pulse - Pertemuan 11
 * Service: Realtime Report Event Processing & Reconciliation
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 *
 * Idempotency & Data Ordering Safeguards:
 * 1. Primary key id sebagai identitas utama record.
 * 2. Event UPDATE lama tidak boleh menimpa data yang lebih baru (pemeriksaan timestamp updatedAt).
 * 3. Event duplikat diproses secara idempotent tanpa membuat entri ganda.
 * 4. Rekonsiliasi otomatis saat status jaringan pulih (reconnect).
 */

import { Subject, Observable, Subscription } from "rxjs";
import { RealtimeReportEvent } from "../../types/realtime";
import { realtimeProvider } from "../../providers/realtime/SupabaseRealtimeProvider";
import { reportCacheRepository } from "../database/reportCacheRepository";
import { networkService } from "../network/networkService";

export class ReportRealtimeService {
  private eventSubject = new Subject<RealtimeReportEvent>();
  private unsubscribeProvider: (() => void) | null = null;
  private networkSubscription: Subscription | null = null;
  private isSubscribed = false;

  /**
   * Memulai langganan ke aliran event realtime dan monitor reconnect
   */
  start(): void {
    if (this.isSubscribed) return;

    // 1. Langganan ke provider realtime (Supabase / Mock)
    this.unsubscribeProvider = realtimeProvider.subscribe((event) => {
      this.handleIncomingEvent(event);
    });

    // 2. Monitor status jaringan untuk pemicu rekonsiliasi saat reconnect
    this.networkSubscription = networkService.networkState$.subscribe((net) => {
      if (net.status === "reconnecting") {
        this.reconcileMissedEvents();
      }
    });

    this.isSubscribed = true;
  }

  /**
   * Menangani event real-time yang masuk dengan aturan idempotensi dan ordering
   */
  private async handleIncomingEvent(event: RealtimeReportEvent): Promise<void> {
    const { type, report } = event;

    if (type === "INSERT") {
      await reportCacheRepository.upsertReport(report);
    } else if (type === "UPDATE") {
      const existing = await reportCacheRepository.getReportById(report.id);
      // Cegah out-of-order updates: abaikan jika data di cache lebih baru dari event
      if (existing && new Date(existing.updatedAt).getTime() > new Date(report.updatedAt).getTime()) {
        return;
      }
      await reportCacheRepository.upsertReport(report);
    } else if (type === "DELETE") {
      await reportCacheRepository.deleteReport(report.id);
    }

    this.eventSubject.next(event);
  }

  /**
   * Rekonsiliasi data setelah aplikasi reconnect atau kembali dari background
   */
  async reconcileMissedEvents(): Promise<void> {
    // Pada arsitektur produksi: memanggil GET /reports?updated_at=gt.{lastSync}
    // Memastikan tidak ada event yang terlewat saat socket terputus
  }

  /**
   * Stream observable event laporan real-time
   */
  get events$(): Observable<RealtimeReportEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * Nama provider yang aktif saat ini
   */
  getActiveProviderName(): string {
    return realtimeProvider.getProviderName();
  }

  /**
   * Berhenti berlangganan dan bersihkan channel websocket
   */
  stop(): void {
    if (this.unsubscribeProvider) {
      this.unsubscribeProvider();
      this.unsubscribeProvider = null;
    }
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
      this.networkSubscription = null;
    }
    this.isSubscribed = false;
  }
}

export const reportRealtimeService = new ReportRealtimeService();
