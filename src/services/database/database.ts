/**
 * Civic Pulse - Pertemuan 11
 * Service: DatabaseManager (expo-sqlite Database Manager & Migrations)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Security & Reliability Principles:
 * 1. Database relasional lokal untuk data terstruktur (cache laporan & antrean outbox).
 * 2. Skema termigrasi secara otomatis & atomik via schema_migrations.
 * 3. Tidak ada token, NIK, atau kredensial yang disimpan di database lokal ini.
 * 4. Mendukung transaksi (withTransactionAsync) untuk konsistensi data.
 */

import * as SQLite from "expo-sqlite";

const DB_NAME = "civic_pulse.db";
const CURRENT_SCHEMA_VERSION = 1;

export class DatabaseManager {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
  private isMigrated = false;

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = SQLite.openDatabaseAsync(DB_NAME);
    }
    const db = await this.dbPromise;

    if (!this.isMigrated) {
      await this.runMigrations(db);
      this.isMigrated = true;
    }

    return db;
  }

  private async runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
    // 1. Buat tabel pelacak migrasi
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const result = await db.getFirstAsync<{ version: number }>(
      "SELECT MAX(version) as version FROM schema_migrations"
    );
    const currentVersion = result?.version || 0;

    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      await db.withTransactionAsync(async () => {
        if (currentVersion < 1) {
          // Migrasi 1: Tabel cache laporan insiden & outbox queue
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS cached_reports (
              id TEXT PRIMARY KEY NOT NULL,
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              description TEXT NOT NULL,
              latitude REAL NOT NULL,
              longitude REAL NOT NULL,
              severity TEXT NOT NULL,
              createdAt TEXT NOT NULL,
              updatedAt TEXT NOT NULL,
              syncedAt TEXT,
              isLocalDraft INTEGER NOT NULL DEFAULT 0,
              version INTEGER NOT NULL DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_cached_reports_updatedAt 
            ON cached_reports(updatedAt);

            CREATE TABLE IF NOT EXISTS outbox_operations (
              operation_id TEXT PRIMARY KEY NOT NULL,
              entity_type TEXT NOT NULL,
              entity_id TEXT NOT NULL,
              operation_type TEXT NOT NULL,
              payload TEXT NOT NULL,
              created_at TEXT NOT NULL,
              retry_count INTEGER NOT NULL DEFAULT 0,
              next_attempt_at TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              last_error TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_outbox_status_next 
            ON outbox_operations(status, next_attempt_at);

            CREATE TABLE IF NOT EXISTS sync_metadata (
              key TEXT PRIMARY KEY NOT NULL,
              value TEXT NOT NULL
            );

            INSERT OR REPLACE INTO schema_migrations (version, applied_at)
            VALUES (1, '${new Date().toISOString()}');
          `);
        }
      });
    }
  }

  async close(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      await db.closeAsync();
      this.dbPromise = null;
      this.isMigrated = false;
    }
  }
}

export const databaseManager = new DatabaseManager();
