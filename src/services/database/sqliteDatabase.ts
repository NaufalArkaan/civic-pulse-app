/**
 * Civic Pulse - Pertemuan 11
 * Database: SQLite Local Storage Initialization
 * Role: Anggota 1 & Anggota 3 (Robi) Integration Baseline
 *
 * Scoped Local Database:
 * Menyimpan cache laporan terstruktur dan antrean outbox offline.
 * Tidak menyimpan kredensial atau NIK di SQLite (kredensial tetap di SecureStore).
 */

import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (isInitializing) {
    // Tunggu jika sedang diinisialisasi
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getDatabase();
  }

  isInitializing = true;
  try {
    const db = await SQLite.openDatabaseAsync("civic_pulse.db");

    // Inisialisasi schema tabel idempotent
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS cached_reports (
        id TEXT PRIMARY KEY NOT NULL,
        reporter_id TEXT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        media_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        severity TEXT NOT NULL,
        is_simulation INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_reports_category ON cached_reports(category);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON cached_reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON cached_reports(updated_at);

      CREATE TABLE IF NOT EXISTS outbox_operations (
        operation_id TEXT PRIMARY KEY NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_operations(status);
    `);

    dbInstance = db;
    return db;
  } finally {
    isInitializing = false;
  }
}
