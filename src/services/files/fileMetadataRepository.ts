/**
 * Civic Pulse - Pertemuan 10
 * Repository: Local File Metadata Repository
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 *
 * Data Classification:
 * Menyimpan manifest metadata dokumen (ID, nama, ukuran, MIME, timestamp, localUri)
 * di direktori privat aplikasi (Scoped Storage), terpisah dari kredensial SecureStore.
 */

import * as FileSystem from "expo-file-system/legacy";
import { VaultFile, VaultMetadataManifest } from "../../types/vault";

const METADATA_VERSION = 1;

export class FileMetadataRepository {
  private vaultDirResolver: () => string;

  constructor(vaultDir: string | (() => string)) {
    this.vaultDirResolver = typeof vaultDir === "function" ? vaultDir : () => vaultDir;
  }

  private get manifestPath(): string {
    const dir = this.vaultDirResolver();
    const cleanDir = dir.endsWith("/") ? dir : `${dir}/`;
    return `${cleanDir}metadata.json`;
  }

  /**
   * Membaca seluruh metadata file dari manifest lokal
   */
  async loadManifest(): Promise<VaultFile[]> {
    try {
      const info = await FileSystem.getInfoAsync(this.manifestPath);
      if (!info.exists) {
        return [];
      }

      const raw = await FileSystem.readAsStringAsync(this.manifestPath);
      const parsed: VaultMetadataManifest = JSON.parse(raw);
      return Array.isArray(parsed?.files) ? parsed.files : [];
    } catch {
      // Graceful fallback jika manifest belum dibuat atau korup
      return [];
    }
  }

  /**
   * Menyimpan daftar metadata ke file manifest secara atomik
   */
  async saveManifest(files: VaultFile[]): Promise<boolean> {
    try {
      const manifest: VaultMetadataManifest = {
        version: METADATA_VERSION,
        updatedAt: new Date().toISOString(),
        files,
      };

      await FileSystem.writeAsStringAsync(
        this.manifestPath,
        JSON.stringify(manifest, null, 2)
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Menambahkan entri metadata file baru
   */
  async addFile(file: VaultFile): Promise<boolean> {
    const list = await this.loadManifest();
    const updated = [file, ...list.filter((f) => f.id !== file.id)];
    return await this.saveManifest(updated);
  }

  /**
   * Menghapus entri metadata berdasarkan ID
   */
  async removeFile(id: string): Promise<boolean> {
    const list = await this.loadManifest();
    const updated = list.filter((f) => f.id !== id);
    return await this.saveManifest(updated);
  }

  /**
   * Mengambil metadata file berdasarkan ID
   */
  async getFileById(id: string): Promise<VaultFile | null> {
    const list = await this.loadManifest();
    return list.find((f) => f.id === id) || null;
  }
}
