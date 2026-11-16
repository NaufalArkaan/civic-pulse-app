/**
 * Civic Pulse - Pertemuan 11
 * Service: LocalReportStore (SQLite Cache for Civic Reports)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Responsibilities:
 * 1. Menyimpan snapshot laporan secara terstruktur di SQLite lokal.
 * 2. Membaca laporan tersimpan ketika offline / server tidak terjangkau.
 * 3. Membedakan draft lokal (isLocalDraft = 1) dengan laporan tersinkronisasi server (isLocalDraft = 0).
 * 4. Melacak metadata sinkronisasi (last_sync_timestamp).
 * 5. Menjamin keamanan: zero plain secrets, zero tokens, zero auth headers.
 */

import { CachedCivicReport, ILocalReportStore } from "../../types/sync";
import { DatabaseManager, databaseManager } from "./database";

type SQLiteReportRow = {
  id: string;
  title: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  isLocalDraft: number;
  version: number;
};

export class LocalReportStore implements ILocalReportStore {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager = databaseManager) {
    this.dbManager = dbManager;
  }

  async initialize(): Promise<void> {
    await this.dbManager.getDatabase();
  }

  async upsertReports(reports: CachedCivicReport[]): Promise<void> {
    if (!reports || reports.length === 0) return;

    const db = await this.dbManager.getDatabase();

    await db.withTransactionAsync(async () => {
      for (const report of reports) {
        await db.runAsync(
          `INSERT INTO cached_reports (
            id, title, category, description, latitude, longitude,
            severity, createdAt, updatedAt, syncedAt, isLocalDraft, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            category = excluded.category,
            description = excluded.description,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            severity = excluded.severity,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt,
            syncedAt = excluded.syncedAt,
            isLocalDraft = excluded.isLocalDraft,
            version = excluded.version;`,
          [
            report.id,
            report.title,
            report.category,
            report.description,
            report.latitude,
            report.longitude,
            report.severity,
            report.createdAt,
            report.updatedAt,
            report.syncedAt,
            report.isLocalDraft ? 1 : 0,
            report.version || 1,
          ]
        );
      }
    });
  }

  async getCachedReports(): Promise<CachedCivicReport[]> {
    const db = await this.dbManager.getDatabase();
    const rows = await db.getAllAsync<SQLiteReportRow>(
      "SELECT * FROM cached_reports ORDER BY createdAt DESC"
    );

    return rows.map((row) => this.mapRowToReport(row));
  }

  async getReportById(id: string): Promise<CachedCivicReport | null> {
    const db = await this.dbManager.getDatabase();
    const row = await db.getFirstAsync<SQLiteReportRow>(
      "SELECT * FROM cached_reports WHERE id = ?",
      [id]
    );

    return row ? this.mapRowToReport(row) : null;
  }

  async deleteReport(id: string): Promise<void> {
    const db = await this.dbManager.getDatabase();
    await db.runAsync("DELETE FROM cached_reports WHERE id = ?", [id]);
  }

  async getLastSyncTimestamp(): Promise<string | null> {
    const db = await this.dbManager.getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM sync_metadata WHERE key = 'last_sync_timestamp'"
    );
    return row ? row.value : null;
  }

  async setLastSyncTimestamp(timestamp: string): Promise<void> {
    const db = await this.dbManager.getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('last_sync_timestamp', ?)",
      [timestamp]
    );
  }

  async clearCache(preserveDrafts = true): Promise<void> {
    const db = await this.dbManager.getDatabase();
    if (preserveDrafts) {
      await db.runAsync("DELETE FROM cached_reports WHERE isLocalDraft = 0");
    } else {
      await db.runAsync("DELETE FROM cached_reports");
    }
  }

  private mapRowToReport(row: SQLiteReportRow): CachedCivicReport {
    return {
      id: row.id,
      title: row.title,
      category: row.category as CachedCivicReport["category"],
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      severity: row.severity as CachedCivicReport["severity"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncedAt: row.syncedAt,
      isLocalDraft: row.isLocalDraft === 1,
      version: row.version,
    };
  }
}

export const localReportStore = new LocalReportStore();
