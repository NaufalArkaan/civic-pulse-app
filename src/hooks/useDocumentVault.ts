/**
 * Civic Pulse - Pertemuan 10
 * Hook: useDocumentVault
 * Role: Anggota 3 (Lead Hardware & Spatial/Network Engineer) & Anggota 1 (Lead System Architect)
 *
 * Mengelola state berkas Document Vault di Scoped Storage,
 * loading state, error handling, pencegahan double-tap import, serta integrasi picker dokumen.
 */

import * as DocumentPicker from "expo-document-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { documentVault } from "../services/files/documentVault";
import { VaultFile, VaultFileCategory } from "../types/vault";

export function useDocumentVault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const isProcessingRef = useRef<boolean>(false);

  const refreshFiles = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);

    const res = await documentVault.listFiles();

    if (!isMountedRef.current) return;

    if (res.success && res.data) {
      setFiles(res.data);
    } else {
      setError(res.error || "Gagal memuat dokumen vault.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let isActive = true;

    async function loadInitialFiles() {
      const res = await documentVault.listFiles();
      if (!isMountedRef.current || !isActive) return;

      if (res.success && res.data) {
        setFiles(res.data);
      } else {
        setError(res.error || "Gagal memuat dokumen vault.");
      }
      setLoading(false);
    }

    loadInitialFiles();

    return () => {
      isActive = false;
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Mengimpor dokumen dari perangkat pengguna menggunakan System Document Picker
   * Dilengkapi guard isProcessingRef untuk mencegah race condition double import
   */
  const importDocument = useCallback(async (): Promise<boolean> => {
    if (isProcessingRef.current) return false;
    isProcessingRef.current = true;

    try {
      setIsImporting(true);
      setError(null);

      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (
        pickerResult.canceled ||
        !pickerResult.assets ||
        pickerResult.assets.length === 0
      ) {
        return false;
      }

      const asset = pickerResult.assets[0];
      const res = await documentVault.importFile(
        asset.uri,
        asset.name,
        asset.mimeType,
      );

      if (!isMountedRef.current) return false;

      if (!res.success) {
        setError(res.error);
        return false;
      }

      await refreshFiles();
      return true;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || "Terjadi kesalahan saat memilih dokumen.");
      }
      return false;
    } finally {
      isProcessingRef.current = false;
      if (isMountedRef.current) {
        setIsImporting(false);
      }
    }
  }, [refreshFiles]);

  /**
   * Menambahkan dokumen demonstrasi simulasi secara offline
   */
  const addDemoReport = useCallback(
    async (
      title: string,
      content: string,
      category: VaultFileCategory = "document",
    ): Promise<boolean> => {
      if (isProcessingRef.current) return false;
      isProcessingRef.current = true;

      try {
        setIsImporting(true);
        setError(null);

        const res = await documentVault.createDemoDocument(
          title,
          content,
          category,
        );

        if (!isMountedRef.current) return false;

        if (!res.success) {
          setError(res.error);
          return false;
        }

        await refreshFiles();
        return true;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err?.message || "Gagal membuat dokumen demonstrasi.");
        }
        return false;
      } finally {
        isProcessingRef.current = false;
        if (isMountedRef.current) {
          setIsImporting(false);
        }
      }
    },
    [refreshFiles],
  );

  /**
   * Menghapus dokumen dari vault dan storage
   */
  const deleteFile = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);
        const res = await documentVault.deleteFile(id);

        if (!isMountedRef.current) return false;

        if (!res.success) {
          setError(res.error);
          return false;
        }

        await refreshFiles();
        return true;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err?.message || "Gagal menghapus berkas.");
        }
        return false;
      }
    },
    [refreshFiles],
  );

  /**
   * Mengambil detail berkas tertentu
   */
  const getFile = useCallback(async (id: string): Promise<VaultFile | null> => {
    const res = await documentVault.getFile(id);
    return res.success && res.data ? res.data : null;
  }, []);

  /**
   * Membersihkan berkas orphan yang tidak terdaftar di metadata
   */
  const cleanupOrphans = useCallback(async (): Promise<number> => {
    const res = await documentVault.cleanupOrphanFiles();
    if (res.success && res.data && res.data > 0) {
      await refreshFiles();
      return res.data;
    }
    return 0;
  }, [refreshFiles]);

  return {
    files,
    loading,
    error,
    isImporting,
    refreshFiles,
    importDocument,
    addDemoReport,
    deleteFile,
    getFile,
    cleanupOrphans,
  };
}
