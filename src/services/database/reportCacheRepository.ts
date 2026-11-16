/**
 * Civic Pulse - Pertemuan 11
 * Repository: Local SQLite Cache for Reports
 * Role: Anggota 1 & Anggota 3 (Robi) Integration Baseline
 */

import { Report } from "../../types/report";
import { SearchCriteria, normalizeQuery } from "../../types/search";
import { getDatabase } from "./sqliteDatabase";
import { SAMPLE_CIVIC_REPORTS } from "../../constants/sampleReports";

// In-memory fallback jika platform atau SQLite driver belum siap
const memoryFallbackCache: Map<string, Report> = new Map(
  SAMPLE_CIVIC_REPORTS.map((r) => [r.id, r])
);

export class ReportCacheRepository {
  /**
   * Menyimpan / memperbarui laporan ke cache lokal (idempotent upsert)
   */
  async upsertReport(report: Report): Promise<void> {
    memoryFallbackCache.set(report.id, report);

    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO cached_reports (
          id, reporter_id, title, category, description, status,
          latitude, longitude, media_path, created_at, updated_at,
          deleted_at, severity, is_simulation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          description = excluded.description,
          status = excluded.status,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          media_path = excluded.media_path,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          severity = excluded.severity,
          is_simulation = excluded.is_simulation
        WHERE excluded.updated_at >= cached_reports.updated_at;`,
        [
          report.id,
          report.reporterId ?? null,
          report.title,
          report.category,
          report.description,
          report.status,
          report.coordinate.latitude,
          report.coordinate.longitude,
          report.mediaPath ?? null,
          report.createdAt,
          report.updatedAt,
          report.deletedAt ?? null,
          report.severity,
          report.isSimulation ? 1 : 0,
        ]
      );
    } catch {
      // Memory fallback handles the state smoothly
    }
  }

  /**
   * Menyimpan batch laporan ke cache lokal
   */
  async upsertReports(reports: Report[]): Promise<void> {
    for (const report of reports) {
      await this.upsertReport(report);
    }
  }

  /**
   * Mengambil laporan dari cache lokal dengan filter dan query
   */
  async queryReports(criteria?: SearchCriteria): Promise<Report[]> {
    const norm = criteria ? normalizeQuery(criteria.query) : "";
    const category = criteria?.category && criteria.category !== "all" ? criteria.category : null;
    const status = criteria?.status && criteria.status !== "all" ? criteria.status : null;

    try {
      const db = await getDatabase();
      let sql = "SELECT * FROM cached_reports WHERE deleted_at IS NULL";
      const params: any[] = [];

      if (category) {
        sql += " AND category = ?";
        params.push(category);
      }

      if (status) {
        sql += " AND status = ?";
        params.push(status);
      }

      if (norm) {
        sql += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)";
        params.push(`%${norm}%`, `%${norm}%`);
      }

      sql += " ORDER BY updated_at DESC";

      const rows = await db.getAllAsync<any>(sql, params);

      if (rows.length > 0) {
        return rows.map((row) => ({
          id: row.id,
          reporterId: row.reporter_id,
          title: row.title,
          category: row.category,
          description: row.description,
          status: row.status,
          coordinate: {
            latitude: row.latitude,
            longitude: row.longitude,
          },
          mediaPath: row.media_path,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
          severity: row.severity,
          isSimulation: Boolean(row.is_simulation),
        }));
      }
    } catch {
      // Gunakan memory fallback
    }

    // Filter memory fallback
    return Array.from(memoryFallbackCache.values())
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
   * Mengambil laporan spesifik berdasarkan ID
   */
  async getReportById(id: string): Promise<Report | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<any>(
        "SELECT * FROM cached_reports WHERE id = ?",
        [id]
      );
      if (row) {
        return {
          id: row.id,
          reporterId: row.reporter_id,
          title: row.title,
          category: row.category,
          description: row.description,
          status: row.status,
          coordinate: {
            latitude: row.latitude,
            longitude: row.longitude,
          },
          mediaPath: row.media_path,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
          severity: row.severity,
          isSimulation: Boolean(row.is_simulation),
        };
      }
    } catch {
      // Fallback
    }

    return memoryFallbackCache.get(id) || null;
  }

  /**
   * Menghapus laporan (soft delete)
   */
  async deleteReport(id: string): Promise<void> {
    const existing = memoryFallbackCache.get(id);
    if (existing) {
      existing.deletedAt = new Date().toISOString();
      memoryFallbackCache.set(id, existing);
    }

    try {
      const db = await getDatabase();
      await db.runAsync(
        "UPDATE cached_reports SET deleted_at = ? WHERE id = ?",
        [new Date().toISOString(), id]
      );
    } catch {
      // Fallback
    }
  }
}

export const reportCacheRepository = new ReportCacheRepository();
