/**
 * Civic Pulse - Pertemuan 10
 * Hook: useRuntimePermissions (Just-In-Time Runtime Permission Orchestrator)
 * Role: Anggota 3 (Lead Hardware & Spatial/Network Engineer)
 *
 * Mengelola status izin Just-In-Time (JIT) untuk kamera, lokasi, dan media.
 * Menjamin izin hanya diminta saat dipicu aksi pengguna, bukan saat startup aplikasi.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  PermissionCheckResult,
  RuntimePermissionStatus,
  RuntimePermissionType,
} from "../types/permissions";
import { permissionService } from "../services/permissions/permissionService";

export function useRuntimePermissions(initialType: RuntimePermissionType = "media") {
  const [status, setStatus] = useState<RuntimePermissionStatus>("not-requested");
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Memeriksa status izin tanpa memunculkan dialog prompt OS
   */
  const checkPermission = useCallback(
    async (type: RuntimePermissionType = initialType): Promise<PermissionCheckResult> => {
      setLoading(true);
      const res = await permissionService.checkPermission(type);
      if (isMountedRef.current) {
        setStatus(res.status);
        setCanAskAgain(res.canAskAgain);
        setMessage(res.message || null);
        setLoading(false);
      }
      return res;
    },
    [initialType]
  );

  /**
   * Meminta izin perangkat Just-In-Time saat pengguna memicu aksi
   */
  const requestPermission = useCallback(
    async (type: RuntimePermissionType = initialType): Promise<PermissionCheckResult> => {
      setLoading(true);
      const res = await permissionService.requestPermission(type);
      if (isMountedRef.current) {
        setStatus(res.status);
        setCanAskAgain(res.canAskAgain);
        setMessage(res.message || null);
        setLoading(false);
      }
      return res;
    },
    [initialType]
  );

  /**
   * Mengarahkan pengguna ke Pengaturan Perangkat jika izin ditolak permanen
   */
  const openAppSettings = useCallback(async (): Promise<boolean> => {
    return await permissionService.openAppSettings();
  }, []);

  return {
    status,
    canAskAgain,
    message,
    loading,
    checkPermission,
    requestPermission,
    openAppSettings,
  };
}
