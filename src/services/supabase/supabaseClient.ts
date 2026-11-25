/**
 * Civic Pulse - Pertemuan 13 (Milestone 5)
 * Service: Supabase PostgREST Client
 * Role: Anggota 1 (Naufal - Lead System Architect & Security Engineer)
 */

import type { Report } from "../../types/report";
import { SearchCriteria, normalizeQuery } from "../../types/search";
import { classifyAppError, ClassifiedError } from "../../utils/errorTaxonomy";
import {
  SUPABASE_QUERY_LIMITS,
  UserRole,
  SupabaseEnvironmentAudit,
  validateStatusTransition,
  detectForbiddenClientKey,
  auditSupabaseEnvironment,
  clampQueryLimit,
} from "../../utils/supabaseSecurity";

export {
  SUPABASE_QUERY_LIMITS,
  validateStatusTransition,
  detectForbiddenClientKey,
  auditSupabaseEnvironment,
  clampQueryLimit,
};
export type { UserRole, SupabaseEnvironmentAudit };

/**
 * Supabase PostgREST Client ringan dengan proteksi timeout, pagination, dan RLS header
 */
export class SupabaseRestClient {
  private baseUrl: string;
  private anonKey: string;

  constructor(customUrl?: string, customKey?: string) {
    this.baseUrl = (customUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
    this.anonKey = customKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  }

  isReady(): boolean {
    const audit = auditSupabaseEnvironment(this.baseUrl, this.anonKey);
    return audit.isConfigured && !audit.securityViolation;
  }

  /**
   * Mengambil daftar laporan dari tabel `public.reports` dengan batas limit & filter
   */
  async fetchReports(
    criteria?: SearchCriteria,
    options?: { limit?: number; offset?: number; accessToken?: string | null }
  ): Promise<{ data: Report[] | null; error: ClassifiedError | null; status: number }> {
    const audit = auditSupabaseEnvironment(this.baseUrl, this.anonKey);
    if (audit.securityViolation) {
      return {
        data: null,
        error: classifyAppError(new Error(audit.securityViolation), 403),
        status: 403,
      };
    }

    if (!audit.isConfigured) {
      return {
        data: null,
        error: classifyAppError(new Error("Supabase environment not configured"), 0),
        status: 0,
      };
    }

    const limit = clampQueryLimit(options?.limit);
    const offset = Math.max(0, options?.offset ?? 0);

    const queryParams = new URLSearchParams();
    queryParams.set(
      "select",
      "id,reporter_id,title,category,description,status,latitude,longitude,media_path,severity,created_at,updated_at"
    );
    queryParams.set("deleted_at", "is.null");
    queryParams.set("order", "updated_at.desc");
    queryParams.set("limit", String(limit));
    queryParams.set("offset", String(offset));

    if (criteria?.category && criteria.category !== "all") {
      queryParams.set("category", `eq.${criteria.category}`);
    }
    if (criteria?.status && criteria.status !== "all") {
      queryParams.set("status", `eq.${criteria.status}`);
    }
    const norm = criteria ? normalizeQuery(criteria.query) : "";
    if (norm) {
      queryParams.set("or", `(title.ilike.*${norm}*,description.ilike.*${norm}*)`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SUPABASE_QUERY_LIMITS.REQUEST_TIMEOUT_MS
    );

    try {
      const token = options?.accessToken || this.anonKey;
      const response = await fetch(
        `${this.baseUrl}/rest/v1/reports?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            apikey: this.anonKey,
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        return {
          data: null,
          error: classifyAppError(
            new Error(`Supabase query failed with HTTP ${response.status}`),
            response.status
          ),
          status: response.status,
        };
      }

      const rows = (await response.json()) as any[];
      const mapped: Report[] = rows.map((row) => ({
        id: String(row.id),
        reporterId: row.reporter_id ?? undefined,
        title: String(row.title || ""),
        category: row.category,
        description: String(row.description || ""),
        status: row.status,
        coordinate: {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        },
        mediaPath: row.media_path ?? null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        severity: row.severity || "medium",
        isSimulation: false,
      }));

      return { data: mapped, error: null, status: response.status };
    } catch (err) {
      return {
        data: null,
        error: classifyAppError(err),
        status: 0,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Menyimpan / memperbarui laporan secara idempotent ke Supabase PostgREST
   */
  async upsertReportRemote(
    report: Report,
    idempotencyKey: string,
    accessToken?: string | null
  ): Promise<{ confirmed: boolean; error: ClassifiedError | null; status: number }> {
    const audit = auditSupabaseEnvironment(this.baseUrl, this.anonKey);
    if (audit.securityViolation) {
      return {
        confirmed: false,
        error: classifyAppError(new Error(audit.securityViolation), 403),
        status: 403,
      };
    }

    if (!audit.isConfigured) {
      return {
        confirmed: false,
        error: classifyAppError(new Error("Supabase environment not configured"), 0),
        status: 0,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SUPABASE_QUERY_LIMITS.REQUEST_TIMEOUT_MS
    );

    try {
      const token = accessToken || this.anonKey;
      const payload = {
        id: report.id,
        reporter_id: report.reporterId ?? null,
        title: report.title,
        category: report.category,
        description: report.description,
        status: report.status,
        latitude: report.coordinate.latitude,
        longitude: report.coordinate.longitude,
        media_path: report.mediaPath ?? null,
        severity: report.severity,
        created_at: report.createdAt,
        updated_at: report.updatedAt,
      };

      const response = await fetch(`${this.baseUrl}/rest/v1/reports`, {
        method: "POST",
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          confirmed: false,
          error: classifyAppError(
            new Error(`Supabase mutation rejected with HTTP ${response.status}`),
            response.status
          ),
          status: response.status,
        };
      }

      return { confirmed: true, error: null, status: response.status };
    } catch (err) {
      return {
        confirmed: false,
        error: classifyAppError(err),
        status: 0,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const supabaseRestClient = new SupabaseRestClient();
