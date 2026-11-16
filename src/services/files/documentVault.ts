/**
 * Civic Pulse - Pertemuan 10
 * Service: DocumentVaultService (expo-file-system app-private sandbox)
 * Role: Anggota 1 & Anggota 3 (Robi) Hardware/File Integration Baseline
 *
 * Security & Scoped Storage Principles:
 * 1. Seluruh berkas disimpan pada sub-direktori privat: documentDirectory + civic-pulse/vault/
 * 2. Menggunakan sanitasi nama berkas untuk mencegah Path Traversal.
 * 3. Menghindari kebocoran status: jika berkas fisik hilang, ditandai 'isMissing' secara aman.
 * 4. Document directory adalah app sandbox, bukan enkripsi file otomatis.
 */

import * as FileSystem from "expo-file-system/legacy";
import {
  IDocumentVaultService,
  VaultFile,
  VaultFileCategory,
  VaultOperationResult,
} from "../../types/vault";
import { FileMetadataRepository } from "./fileMetadataRepository";
import {
  inferFileCategory,
  isAllowedFile,
  MAX_FILE_SIZE_BYTES,
  sanitizeFileName,
} from "../../utils/fileValidation";

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
          error: "documentDirectory tidak tersedia pada perangkat.",
        };
      }

      const dirInfo = await FileSystem.getInfoAsync(this.vaultDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.vaultDir, { intermediates: true });
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
              sizeBytes: check.exists && "size" in check ? (check.size as number) : file.sizeBytes,
            };
          } catch {
            return { ...file, isMissing: true };
          }
        })
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
   */
  async importFile(
    sourceUri: string,
    originalName: string,
    mimeType?: string | null,
    categoryOverride?: VaultFileCategory
  ): Promise<VaultOperationResult<VaultFile>> {
    try {
      await this.initializeVault();

      const cleanName = sanitizeFileName(originalName);

      if (!isAllowedFile(cleanName, mimeType)) {
        return {
          success: false,
          data: null,
          error: `Format berkas "${cleanName}" tidak didukung. Gunakan JPG, PNG, WEBP, PDF, atau TXT.`,
        };
      }

      // Verifikasi ukuran berkas sumber jika memungkinkan
      const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
      if (!sourceInfo.exists) {
        return {
          success: false,
          data: null,
          error: "Berkas sumber tidak ditemukan pada URI yang diberikan.",
        };
      }

      if ("size" in sourceInfo && sourceInfo.size && sourceInfo.size > MAX_FILE_SIZE_BYTES) {
        return {
          success: false,
          data: null,
          error: `Ukuran berkas (${Math.round(sourceInfo.size / 1024)} KB) melebihi batas 10 MB.`,
        };
      }

      // Buat ID unik dan path tujuan di app sandbox
      const fileId = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const targetUri = `${this.vaultDir}${fileId}_${cleanName}`;

      // Salin berkas ke private sandbox
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri,
      });

      const finalCategory = categoryOverride || inferFileCategory(cleanName, mimeType);

      const vaultEntry: VaultFile = {
        id: fileId,
        displayName: cleanName,
        mimeType: mimeType || null,
        sizeBytes: "size" in sourceInfo ? (sourceInfo.size as number) : null,
        createdAt: new Date().toISOString(),
        localUri: targetUri,
        category: finalCategory,
        isMissing: false,
      };

      // Simpan metadata
      await this.metadataRepo.addFile(vaultEntry);

      return {
        success: true,
        data: vaultEntry,
        error: null,
      };
    } catch (err: any) {
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
    category: VaultFileCategory = "document"
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

      await this.metadataRepo.addFile(entry);

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

      // Hapus berkas fisik jika ada
      try {
        const check = await FileSystem.getInfoAsync(entry.localUri);
        if (check.exists) {
          await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        }
      } catch {
        // Lanjutkan penghapusan metadata jika berkas fisik sudah tidak ada
      }

      // Hapus entri dari manifest metadata
      await this.metadataRepo.removeFile(id);

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
   * Mengambil detail satu berkas
   */
  async getFile(id: string): Promise<VaultOperationResult<VaultFile>> {
    const entry = await this.metadataRepo.getFileById(id);
    if (!entry) {
      return {
        success: false,
        data: null,
        error: "Berkas tidak ditemukan.",
      };
    }
    return {
      success: true,
      data: entry,
      error: null,
    };
  }
}

export const documentVault = new DocumentVaultService();
