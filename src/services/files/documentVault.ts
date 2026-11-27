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
import { primeLocalImageCache } from "../../utils/reportMedia";
import { FileMetadataRepository } from "./fileMetadataRepository";

/**
 * Menyalin berkas secara tangguh (resilient) ke sandbox Scoped Storage
 * Menjaga integritas data biner gambar & dokumen, mengatasi batasan cache scoped storage di Android/Expo Go
 */
async function copyFileToSandbox(
  sourceUri: string,
  targetUri: string,
  base64Data?: string | null,
): Promise<void> {
  // 1. PRIORITAS UTAMA: copyAsync native OS (100% integritas biner asli, tidak merusak gambar/dokumen)
  try {
    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetUri,
    });
    const check = await FileSystem.getInfoAsync(targetUri);
    if (check.exists && "size" in check && typeof check.size === "number" && check.size > 0) {
      return;
    }
  } catch {
    // copyAsync dapat ditolak jika ada batasan permission cache di Expo Go/Android DocumentPicker
  }

  // 2. Fallback jika Base64 disediakan langsung oleh ImagePicker/Camera
  if (base64Data && base64Data.length > 0) {
    try {
      const cleanBase64 = (base64Data.includes(",") ? base64Data.split(",")[1] : base64Data).trim();
      await FileSystem.writeAsStringAsync(targetUri, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const check = await FileSystem.getInfoAsync(targetUri);
      if (check.exists && "size" in check && typeof check.size === "number" && check.size > 0) {
        return;
      }
    } catch {
      // Lanjutkan ke fallback stream
    }
  }

  // 3. Fallback OS Native: Baca stream biner langsung via FileSystem.readAsStringAsync
  try {
    let directBase64: string | null = null;
    try {
      directBase64 = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      if (sourceUri.includes("%")) {
        directBase64 = await FileSystem.readAsStringAsync(decodeURI(sourceUri), {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    }

    if (directBase64 && directBase64.length > 0) {
      await FileSystem.writeAsStringAsync(targetUri, directBase64.trim(), {
        encoding: FileSystem.EncodingType.Base64,
      });
      const check = await FileSystem.getInfoAsync(targetUri);
      if (check.exists && "size" in check && typeof check.size === "number" && check.size > 0) {
        return;
      }
    }
  } catch (readErr: any) {
    // 4. Jika URI adalah remote web URL
    if (sourceUri.startsWith("http://") || sourceUri.startsWith("https://")) {
      await FileSystem.downloadAsync(sourceUri, targetUri);
      return;
    }

    throw new Error(
      `Gagal menyalin berkas dari perangkat: ${readErr?.message || "Izin akses berkas ditolak oleh sistem operasi."}`
    );
  }
}

export class DocumentVaultService implements IDocumentVaultService {
  private metadataRepo: FileMetadataRepository;

  constructor() {
    this.metadataRepo = new FileMetadataRepository(() => this.vaultDir);
  }

  get vaultDir(): string {
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
    const cleanBase = baseDir.endsWith("/") ? baseDir : `${baseDir}/`;
    return `${cleanBase}civic-pulse/vault/`;
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
            const fileName = file.localUri.split("/").pop() || `${file.id}_${file.displayName}`;
            const activeLocalUri = `${this.vaultDir}${fileName}`;
            const check = await FileSystem.getInfoAsync(activeLocalUri);
            const checkedSize =
              check.exists && "size" in check && typeof check.size === "number" && check.size > 0
                ? check.size
                : file.sizeBytes;
            return {
              ...file,
              localUri: activeLocalUri,
              isMissing: !check.exists,
              sizeBytes: checkedSize && file.sizeBytes ? Math.max(checkedSize, file.sizeBytes) : checkedSize,
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
    knownSizeBytes?: number | null,
    base64Data?: string | null,
  ): Promise<VaultOperationResult<VaultFile>> {
    let targetUri: string | null = null;
    try {
      await this.initializeVault();

      // 1. Dapatkan perkiraan ukuran awal secara toleran
      let sourceSizeBytes = knownSizeBytes && knownSizeBytes > 0 ? knownSizeBytes : null;

      try {
        const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
        if (sourceInfo.exists) {
          const infoSize =
            "size" in sourceInfo && typeof sourceInfo.size === "number" && sourceInfo.size > 0
              ? sourceInfo.size
              : null;
          sourceSizeBytes = sourceSizeBytes || infoSize;
        }
      } catch {
        // Abaikan error getInfoAsync pada sourceUri (seperti "Location isn't readable" di cache DocumentPicker)
      }

      // Pastikan nama berkas memiliki ekstensi yang valid jika sistem picker tidak menyediakannya
      let safeOriginalName = originalName || `dokumen_${Date.now()}`;
      if (!safeOriginalName.includes(".")) {
        if (mimeType?.includes("pdf")) safeOriginalName += ".pdf";
        else if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) safeOriginalName += ".jpg";
        else if (mimeType?.includes("png")) safeOriginalName += ".png";
        else if (mimeType?.includes("zip")) safeOriginalName += ".zip";
        else if (mimeType?.includes("word") || mimeType?.includes("officedocument")) safeOriginalName += ".docx";
        else safeOriginalName += ".pdf";
      }

      // 2. Validasi ekstensi, MIME, dan ukuran maksimum berkas
      const validation = validateFileEntry(
        safeOriginalName,
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

      // 4. Salin berkas ke private sandbox dengan integritas biner utuh
      await copyFileToSandbox(sourceUri, targetUri, base64Data);

      // 5. Periksa integritas fisik berkas setelah disalin ke sandbox privat
      const targetCheck = await FileSystem.getInfoAsync(targetUri);
      if (!targetCheck.exists) {
        throw new Error("Penyalinan berkas selesai tetapi berkas fisik tidak ditemukan di Scoped Storage.");
      }

      const realSizeBytes =
        "size" in targetCheck && typeof targetCheck.size === "number" && targetCheck.size > 0
          ? targetCheck.size
          : sourceSizeBytes;

      // Validasi batas kapasitas maksimum (150 MB)
      if (realSizeBytes && realSizeBytes > MAX_FILE_SIZE_BYTES) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
        return {
          success: false,
          data: null,
          error: `Ukuran berkas (${(realSizeBytes / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum 150 MB.`,
        };
      }

      const finalCategory = categoryOverride || validation.category;

      if (finalCategory === "photo" && base64Data) {
        primeLocalImageCache(targetUri, base64Data, mimeType);
      }

      const vaultEntry: VaultFile = {
        id: fileId,
        displayName: cleanName,
        mimeType: mimeType || null,
        sizeBytes: realSizeBytes,
        createdAt: new Date().toISOString(),
        localUri: targetUri,
        category: finalCategory,
        isMissing: false,
      };

      // 6. Simpan metadata dengan proteksi rollback atomik
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
   * Membuat dokumen laporan & paket bukti lapangan langsung di sandbox privat
   * Mendukung penyertaan blok data lampiran berkapasitas besar (dalam satuan MB)
   */
  async createDemoDocument(
    title: string,
    content: string,
    category: VaultFileCategory = "document",
    targetSizeMb = 2.4,
  ): Promise<VaultOperationResult<VaultFile>> {
    try {
      await this.initializeVault();

      const cleanTitle = sanitizeFileName(title);
      const ext = category === "photo" ? ".jpg" : ".pdf";
      const mime = category === "photo" ? "image/jpeg" : "application/pdf";
      const fileId = `vault_doc_${Date.now()}`;
      const hasExt = cleanTitle.toLowerCase().endsWith(ext) || cleanTitle.toLowerCase().endsWith(".txt");
      const displayFileName = hasExt ? cleanTitle : `${cleanTitle}${ext}`;
      const fileName = `${fileId}_${displayFileName}`;
      const targetUri = `${this.vaultDir}${fileName}`;

      // Bangun payload berkas nyata di FileSystem (atau ukuran MB sesuai pilihan paket bukti)
      const targetBytes = Math.max(content.length, Math.round(targetSizeMb * 1024 * 1024));

      if (category === "photo") {
        // Tulis foto riil JPEG yang valid (bukan text dummy agar dapat didekode oleh Android BitmapFactory)
        try {
          await FileSystem.downloadAsync(
            "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
            targetUri,
          );
        } catch {
          // Fallback biner JPEG 1x1 valid jika perangkat sedang offline
          const fallbackJpegBase64 =
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
          await FileSystem.writeAsStringAsync(targetUri, fallbackJpegBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } else {
        // Tulis blok konten laporan + lampiran dokumen teks/PDF simulasi terstruktur ke disk sandbox
        const chunkBlock = "CIVIC_PULSE_EVIDENCE_PAYLOAD_BLOCK_".repeat(1024); // ~35 KB per blok
        const repeatCount = Math.min(80, Math.max(1, Math.floor(targetBytes / chunkBlock.length)));
        const fullPayload = `${content}\n\n--- LAMPIRAN DATA BUKTI LAPANGAN ---\n${chunkBlock.repeat(repeatCount)}`;

        await FileSystem.writeAsStringAsync(targetUri, fullPayload, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const info = await FileSystem.getInfoAsync(targetUri);
      const diskSize = "size" in info && typeof info.size === "number" ? info.size : targetBytes;
      const recordedSizeBytes = Math.max(diskSize, targetBytes);

      const entry: VaultFile = {
        id: fileId,
        displayName: displayFileName,
        mimeType: mime,
        sizeBytes: recordedSizeBytes,
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
          error: "Gagal menyimpan metadata dokumen ke vault.",
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
        error: err?.message || "Gagal membuat dokumen di vault.",
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
