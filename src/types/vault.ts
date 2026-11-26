/**
 * Civic Pulse - Pertemuan 10
 * Architectural Contract: Document Vault & Scoped Storage Types
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

export type VaultFileCategory = "photo" | "document" | "other";

export type VaultFile = {
  id: string;
  displayName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  localUri: string;
  category: VaultFileCategory;
  isMissing?: boolean;
};

export type VaultOperationResult<T = void> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export type VaultMetadataManifest = {
  version: number;
  updatedAt: string;
  files: VaultFile[];
};

export interface IDocumentVaultService {
  initializeVault(): Promise<VaultOperationResult<string>>;
  listFiles(): Promise<VaultOperationResult<VaultFile[]>>;
  importFile(
    sourceUri: string,
    originalName: string,
    mimeType?: string | null,
    category?: VaultFileCategory,
    knownSizeBytes?: number | null,
    base64Data?: string | null
  ): Promise<VaultOperationResult<VaultFile>>;
  deleteFile(id: string): Promise<VaultOperationResult<void>>;
  getFile(id: string): Promise<VaultOperationResult<VaultFile>>;
}
