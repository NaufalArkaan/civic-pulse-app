/**
 * Civic Pulse - Pertemuan 10
 * Hook: useDocumentVault
 * Role: Anggota 1 & Anggota 3 (Robi) Integration Baseline
 *
 * Mengelola state berkas Document Vault di Scoped Storage,
 * loading state, error handling, serta integrasi picker dokumen.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as DocumentPicker from "expo-document-picker";
import { VaultFile, VaultFileCategory } from "../types/vault";
import { documentVault } from "../services/files/documentVault";

export function useDocumentVault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

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
   */
  const importDocument = useCallback(async (): Promise<boolean> => {
    try {
      setIsImporting(true);
      setError(null);

      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        setIsImporting(false);
        return false;
      }

      const asset = pickerResult.assets[0];
      const res = await documentVault.importFile(
        asset.uri,
        asset.name,
        asset.mimeType
      );

      if (!isMountedRef.current) return false;

      if (!res.success) {
        setError(res.error);
        setIsImporting(false);
        return false;
      }

      await refreshFiles();
      setIsImporting(false);
      return true;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || "Terjadi kesalahan saat memilih dokumen.");
        setIsImporting(false);
      }
      return false;
    }
  }, [refreshFiles]);

  /**
   * Menambahkan dokumen demonstrasi simulasi secara offline
   */
  const addDemoReport = useCallback(
    async (title: string, content: string, category: VaultFileCategory = "document"): Promise<boolean> => {
      try {
        setIsImporting(true);
        setError(null);

        const res = await documentVault.createDemoDocument(title, content, category);

        if (!isMountedRef.current) return false;

        if (!res.success) {
          setError(res.error);
          setIsImporting(false);
          return false;
        }

        await refreshFiles();
        setIsImporting(false);
        return true;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err?.message || "Gagal membuat dokumen demonstrasi.");
          setIsImporting(false);
        }
        return false;
      }
    },
    [refreshFiles]
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
    [refreshFiles]
  );

  return {
    files,
    loading,
    error,
    isImporting,
    refreshFiles,
    importDocument,
    addDemoReport,
    deleteFile,
  };
}
