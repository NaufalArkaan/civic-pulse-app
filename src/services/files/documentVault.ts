/**
 * Civic Pulse - Pertemuan 10
 * Service: DocumentVaultService (expo-file-system app-private sandbox)
 * Role: Anggota 3 (Lead Hardware & Spatial/Network Engineer) & Anggota 1 (Lead System Architect)
 *
 * Security & Scoped Storage Principles:
 * 1. Seluruh berkas disimpan pada sub-direktori privat: documentDirectory + civic-pulse/vault/
 * 2. Menggunakan sanitasi nama berkas untuk mencegah Path Traversal (CWE-22).
 * 3. Menghindari kebocoran status: jika berkas fisik hilang, ditandai 'isMissing' secara aman.
 * 4. Document directory adalah app sandbox, bukan enkripsi file otomatis.
 * 5. Rollback atomik: jika penyalinan berkas berhasil namun penyimpanan metadata gagal, berkas disingkirkan.
 * 6. Deletion safety: jika penghapusan berkas fisik gagal, metadata tidak dihapus seolah-olah berhasil.
 */

import * as FileSystem from "expo-file-system/legacy";
import {
  IDocumentVaultService,
  VaultFile,
  VaultFileCategory,
  VaultOperationResult,
} from "../../types/vault";
import {
  MAX_FILE_SIZE_BYTES,
  sanitizeFileName,
  validateFileEntry,
} from "../../utils/fileValidation";
import { FileMetadataRepository } from "./fileMetadataRepository";

export class DocumentVaultService implements IDocumentVaultService {
  private vaultDir: string;
  private metadataRepo: FileMetadataRepository;

  constructor() {
    const baseDir = FileSystem.documentDirectory || "";
    this.vaultDir = `${baseDir}civic-pulse/vault/`;
    this.metadataRepo = new FileMetadataRepository(this.vaultDir);
  }

  /**
   * Menginisialisasi direktori vault secara idempotent
   */
  async initializeVault(): Promise<VaultOperationResult<string>> {
    try {
      if (!FileSystem.documentDirectory) {
        return {
          success: false,
          data: null,
          error:
            "documentDirectory tidak tersedia pada lingkungan perangkat ini.",
        };
      }

      const dirInfo = await FileSystem.getInfoAsync(this.vaultDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.vaultDir, {
          intermediates: true,
        });
      }

      return {
        success: true,
        data: this.vaultDir,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal menginisialisasi direktori vault.",
      };
    }
  }

  /**
   * Menampilkan daftar file di vault beserta verifikasi keberadaan fisik (missing detection)
   */
  async listFiles(): Promise<VaultOperationResult<VaultFile[]>> {
    try {
      await this.initializeVault();
      const files = await this.metadataRepo.loadManifest();

      // Verifikasi integritas: pastikan file fisik benar-benar ada di storage
      const verifiedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            const check = await FileSystem.getInfoAsync(file.localUri);
            return {
              ...file,
              isMissing: !check.exists,
              sizeBytes:
                check.exists && "size" in check
                  ? (check.size as number)
                  : file.sizeBytes,
            };
          } catch {
            return { ...file, isMissing: true };
          }
        }),
      );

      return {
        success: true,
        data: verifiedFiles,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal memuat daftar berkas vault.",
      };
    }
  }

  /**
   * Mengimpor file ke direktori privat aplikasi (Scoped Storage Sandbox)
   * Dilengkapi proteksi rollback: jika simpan metadata gagal, berkas yang sudah disalin dihapus.
   */
  async importFile(
    sourceUri: string,
    originalName: string,
    mimeType?: string | null,
    categoryOverride?: VaultFileCategory,
  ): Promise<VaultOperationResult<VaultFile>> {
    let targetUri: string | null = null;
    try {
      await this.initializeVault();

      // 1. Verifikasi keberadaan berkas sumber terlebih dahulu
      const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
      if (!sourceInfo.exists) {
        return {
          success: false,
          data: null,
          error: "Berkas sumber tidak ditemukan pada URI yang diberikan.",
        };
      }

      const sourceSizeBytes =
        "size" in sourceInfo ? (sourceInfo.size as number) : null;

      // 2. Validasi ekstensi, MIME, dan ukuran maksimum berkas
      const validation = validateFileEntry(
        originalName,
        mimeType,
        sourceSizeBytes,
        MAX_FILE_SIZE_BYTES,
      );

      if (!validation.valid) {
        return {
          success: false,
          data: null,
          error:
            validation.error ||
            "Berkas tidak memenuhi kriteria validasi keamanan.",
        };
      }

      const cleanName = validation.sanitizedName;

      // 3. Buat ID unik dan path tujuan di app sandbox privat
      const fileId = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      targetUri = `${this.vaultDir}${fileId}_${cleanName}`;

      // 4. Salin berkas ke private sandbox tanpa memuat seluruh konten ke memory (streaming copy)
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri,
      });

      const finalCategory = categoryOverride || validation.category;

      const vaultEntry: VaultFile = {
        id: fileId,
        displayName: cleanName,
        mimeType: mimeType || null,
        sizeBytes: sourceSizeBytes,
        createdAt: new Date().toISOString(),
        localUri: targetUri,
        category: finalCategory,
        isMissing: false,
      };

      // 5. Simpan metadata dengan proteksi rollback atomik
      try {
        const metadataSaved = await this.metadataRepo.addFile(vaultEntry);
        if (!metadataSaved) {
          // Rollback: Hapus berkas fisik yang baru disalin agar tidak menjadi orphan
          await FileSystem.deleteAsync(targetUri, { idempotent: true });
          return {
            success: false,
            data: null,
            error:
              "Gagal menyimpan metadata berkas. Berkas fisik telah dibatalkan (rollback).",
          };
        }
      } catch (metaErr: any) {
        // Rollback berkas fisik jika terjadi eksepsi saat simpan metadata
        try {
          await FileSystem.deleteAsync(targetUri, { idempotent: true });
        } catch {
          // Best effort rollback
        }
        return {
          success: false,
          data: null,
          error: `Gagal memperbarui manifest metadata: ${metaErr?.message || "Kesalahan I/O metadata."}. Berkas fisik telah dibersihkan.`,
        };
      }

      return {
        success: true,
        data: vaultEntry,
        error: null,
      };
    } catch (err: any) {
      // Jika terjadi kegagalan tak terduga setelah copyAsync, lakukan rollback
      if (targetUri) {
        try {
          await FileSystem.deleteAsync(targetUri, { idempotent: true });
        } catch {}
      }

      return {
        success: false,
        data: null,
        error: err?.message || "Gagal menyalin berkas ke Document Vault.",
      };
    }
  }

  /**
   * Membuat dokumen teks laporan mitigasi bencana simulasi langsung di sandbox
   * Sangat berguna untuk pengujian offline tanpa file eksternal
   */
  async createDemoDocument(
    title: string,
    content: string,
    category: VaultFileCategory = "document",
  ): Promise<VaultOperationResult<VaultFile>> {
    try {
      await this.initializeVault();

      const cleanTitle = sanitizeFileName(title);
      const fileId = `vault_demo_${Date.now()}`;
      const fileName = `${fileId}_${cleanTitle}.txt`;
      const targetUri = `${this.vaultDir}${fileName}`;

      await FileSystem.writeAsStringAsync(targetUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const info = await FileSystem.getInfoAsync(targetUri);

      const entry: VaultFile = {
        id: fileId,
        displayName: `${cleanTitle}.txt`,
        mimeType: "text/plain",
        sizeBytes: "size" in info ? (info.size as number) : content.length,
        createdAt: new Date().toISOString(),
        localUri: targetUri,
        category,
        isMissing: false,
      };

      const saved = await this.metadataRepo.addFile(entry);
      if (!saved) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
        return {
          success: false,
          data: null,
          error: "Gagal menyimpan metadata dokumen demonstrasi.",
        };
      }

      return {
        success: true,
        data: entry,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal membuat dokumen demonstrasi di vault.",
      };
    }
  }

  /**
   * Menghapus file fisik dari direktori privat dan membersihkan entri metadata
   * Integritas data: jika berkas fisik gagal dihapus, metadata tidak dihapus seolah-olah sukses.
   */
  async deleteFile(id: string): Promise<VaultOperationResult<void>> {
    try {
      const entry = await this.metadataRepo.getFileById(id);
      if (!entry) {
        return {
          success: false,
          data: null,
          error: "Entri berkas tidak ditemukan di metadata.",
        };
      }

      // 1. Cek keberadaan berkas fisik
      let fileExists = false;
      try {
        const check = await FileSystem.getInfoAsync(entry.localUri);
        fileExists = check.exists;
      } catch {
        fileExists = false;
      }

      // 2. Hapus berkas fisik jika ada
      if (fileExists) {
        try {
          await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        } catch (delErr: any) {
          return {
            success: false,
            data: null,
            error: `Gagal menghapus berkas fisik: ${delErr?.message || "Kesalahan I/O sistem berkas"}. Operasi dibatalkan demi konsistensi data.`,
          };
        }
      }

      // 3. Setelah berkas fisik terhapus (atau memang sudah hilang sebelumnya), hapus dari metadata
      const removed = await this.metadataRepo.removeFile(id);
      if (!removed) {
        return {
          success: false,
          data: null,
          error: "Gagal memperbarui manifest metadata saat menghapus berkas.",
        };
      }

      return {
        success: true,
        data: null,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal menghapus berkas dari vault.",
      };
    }
  }

  /**
   * Mengambil detail satu berkas beserta status keberadaan fisik
   */
  async getFile(id: string): Promise<VaultOperationResult<VaultFile>> {
    try {
      const entry = await this.metadataRepo.getFileById(id);
      if (!entry) {
        return {
          success: false,
          data: null,
          error: "Berkas tidak ditemukan dalam metadata.",
        };
      }

      // Verifikasi keberadaan fisik berkas
      try {
        const check = await FileSystem.getInfoAsync(entry.localUri);
        return {
          success: true,
          data: {
            ...entry,
            isMissing: !check.exists,
            sizeBytes:
              check.exists && "size" in check
                ? (check.size as number)
                : entry.sizeBytes,
          },
          error: null,
        };
      } catch {
        return {
          success: true,
          data: { ...entry, isMissing: true },
          error: null,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error: err?.message || "Gagal mengambil data berkas.",
      };
    }
  }

  /**
   * Mendeteksi dan membersihkan berkas orphan (berkas fisik tanpa entri di metadata)
   */
  async cleanupOrphanFiles(): Promise<VaultOperationResult<number>> {
    try {
      await this.initializeVault();
      const files = await this.metadataRepo.loadManifest();
      const knownUris = new Set(files.map((f) => f.localUri));

      const dirContents = await FileSystem.readDirectoryAsync(this.vaultDir);
      let removedCount = 0;

      for (const fileName of dirContents) {
        // Jangan hapus manifest metadata.json
        if (fileName === "metadata.json") continue;

        const fullUri = `${this.vaultDir}${fileName}`;
        if (!knownUris.has(fullUri)) {
          try {
            await FileSystem.deleteAsync(fullUri, { idempotent: true });
            removedCount++;
          } catch {
            // Abaikan kegagalan individual
          }
        }
      }

      return {
        success: true,
        data: removedCount,
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        data: 0,
        error: err?.message || "Gagal membersihkan berkas orphan.",
      };
    }
  }
}

export const documentVault = new DocumentVaultService();
