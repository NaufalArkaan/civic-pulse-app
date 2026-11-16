/**
 * Civic Pulse - Pertemuan 11
 * Architectural Contract: Realtime Data Pipeline & Provider Interfaces
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 */

import { Report } from "./report";

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

export type RealtimeReportEvent = {
  type: RealtimeEventType;
  reportId: string;
  report: Report;
  timestamp: string;
  source: "supabase" | "mock_simulation";
};

export type RealtimeConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT";

export interface IRealtimeProvider {
  /** Inisialisasi koneksi channel websocket/realtime */
  connect(): Promise<void>;
  /** Tutup koneksi channel */
  disconnect(): Promise<void>;
  /** Subscribe ke aliran event laporan */
  subscribe(onEvent: (event: RealtimeReportEvent) => void): () => void;
  /** Cek status koneksi realtime saat ini */
  isConnected(): boolean;
  /** Nama provider untuk transparansi UI (Supabase / Mock Simulation) */
  getProviderName(): string;
}
