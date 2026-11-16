/**
 * Civic Pulse - Pertemuan 11
 * Provider: MockRealtimeProvider (Development / Offline Simulation)
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 *
 * Catatan Integritas Arsitektur:
 * Provider ini bertindak sebagai simulasi saluran WebSocket real-time untuk pengembangan
 * dan demonstrasi tanpa bergantung pada kredensial backend eksternal palsu.
 * Memancarkan event INSERT, UPDATE, dan DELETE dengan struktur yang identik dengan Supabase Realtime.
 */

import { Subject } from "rxjs";
import {
  IRealtimeProvider,
  RealtimeReportEvent,
  RealtimeEventType,
} from "../../types/realtime";
import { Report } from "../../types/report";

export class MockRealtimeProvider implements IRealtimeProvider {
  private eventSubject = new Subject<RealtimeReportEvent>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  subscribe(onEvent: (event: RealtimeReportEvent) => void): () => void {
    this.connected = true;
    const subscription = this.eventSubject.subscribe((evt) => {
      onEvent(evt);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  getProviderName(): string {
    return "Mock Development Stream (Simulasi Realtime)";
  }

  /**
   * Helper untuk menyimulasikan event masuk dari jaringan
   */
  emitSimulatedEvent(type: RealtimeEventType, report: Report): void {
    if (!this.connected) return;

    const event: RealtimeReportEvent = {
      type,
      reportId: report.id,
      report: {
        ...report,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      source: "mock_simulation",
    };

    this.eventSubject.next(event);
  }
}

export const mockRealtimeProvider = new MockRealtimeProvider();
