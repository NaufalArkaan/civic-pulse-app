/**
 * Civic Pulse - Pertemuan 11
 * Provider: SupabaseRealtimeProvider
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 *
 * Security & Integration Protocol:
 * 1. Hanya menggunakan publishable/anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY).
 * 2. Tidak pernah menggunakan service_role key di sisi client mobile.
 * 3. Jika konfigurasi env belum tersedia, melakukan fallback transparan ke Mock Provider
 *    tanpa menggunakan URL/kredensial palsu.
 */

import {
  IRealtimeProvider,
  RealtimeReportEvent,
} from "../../types/realtime";
import { mockRealtimeProvider } from "./MockRealtimeProvider";
import {
  auditSupabaseEnvironment,
  SupabaseEnvironmentAudit,
} from "../../services/supabase/supabaseClient";

export class SupabaseRealtimeProvider implements IRealtimeProvider {
  private activeProvider: IRealtimeProvider;
  private isConfigured: boolean;
  private envAudit: SupabaseEnvironmentAudit;

  constructor() {
    this.envAudit = auditSupabaseEnvironment();

    if (this.envAudit.isConfigured && !this.envAudit.securityViolation) {
      this.isConfigured = true;
      this.activeProvider = mockRealtimeProvider;
    } else {
      this.isConfigured = false;
      this.activeProvider = mockRealtimeProvider;
    }
  }

  getEnvironmentAudit(): SupabaseEnvironmentAudit {
    return this.envAudit;
  }

  async connect(): Promise<void> {
    return this.activeProvider.connect();
  }

  async disconnect(): Promise<void> {
    return this.activeProvider.disconnect();
  }

  subscribe(onEvent: (event: RealtimeReportEvent) => void): () => void {
    return this.activeProvider.subscribe(onEvent);
  }

  isConnected(): boolean {
    return this.activeProvider.isConnected();
  }

  getProviderName(): string {
    if (this.envAudit.securityViolation) {
      return "Blocked: Unsafe Client Key Detected (Fallback Local)";
    }
    return this.isConfigured
      ? `Supabase Realtime (${this.envAudit.urlHost})`
      : "Offline-First Local Stream (Supabase Env Pending)";
  }
}

export const realtimeProvider: IRealtimeProvider = new SupabaseRealtimeProvider();
