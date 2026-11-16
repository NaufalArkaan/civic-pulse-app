/**
 * Civic Pulse - Pertemuan 11
 * Hook: useOfflineSync (Reactive Offline-First Data & Synchronization)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Capabilities for UI (Syahril / Naufal):
 * 1. Read cached reports instantly from SQLite even without network.
 * 2. Observe pending outbox operations counter for offline badge/indicator.
 * 3. Automatic background sync trigger upon reconnection to online status.
 * 4. Manual pull-to-refresh / syncNow() trigger.
 * 5. Lifecycle safe with mounted check.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CachedCivicReport, SyncResult } from "../types/sync";
import { localReportStore } from "../services/database/localReportStore";
import { outboxRepository } from "../services/sync/outboxRepository";
import { syncEngine } from "../services/sync/syncEngine";
import { useNetworkState } from "./useNetworkState";

export type UseOfflineSyncResult = {
  cachedReports: CachedCivicReport[];
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  refreshLocalData: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  addOfflineReport: (
    reportData: Omit<CachedCivicReport, "syncedAt" | "isLocalDraft" | "version">
  ) => Promise<CachedCivicReport>;
};

export function useOfflineSync(): UseOfflineSyncResult {
  const { networkState, isOnline } = useNetworkState();
  const [cachedReports, setCachedReports] = useState<CachedCivicReport[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const wasOfflineRef = useRef(false);

  const refreshLocalData = useCallback(async () => {
    try {
      const [reports, pending, lastSync] = await Promise.all([
        localReportStore.getCachedReports(),
        outboxRepository.getPendingCount(),
        localReportStore.getLastSyncTimestamp(),
      ]);

      if (isMountedRef.current) {
        setCachedReports(reports);
        setPendingCount(pending);
        setLastSyncedAt(lastSync);
      }
    } catch (err) {
      console.warn("[useOfflineSync] Error refreshing local data:", err);
    }
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (isMountedRef.current) {
      setIsSyncing(true);
    }
    try {
      const result = await syncEngine.syncAll();
      await refreshLocalData();
      return result;
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [refreshLocalData]);

  const addOfflineReport = useCallback(
    async (
      reportData: Omit<CachedCivicReport, "syncedAt" | "isLocalDraft" | "version">
    ): Promise<CachedCivicReport> => {
      const created = await syncEngine.addReportOffline(reportData);
      await refreshLocalData();
      return created;
    },
    [refreshLocalData]
  );

  // Initial load
  useEffect(() => {
    let isSubscribed = true;

    const initializeData = async () => {
      try {
        const [reports, pending, lastSync] = await Promise.all([
          localReportStore.getCachedReports(),
          outboxRepository.getPendingCount(),
          localReportStore.getLastSyncTimestamp(),
        ]);

        if (isSubscribed) {
          setCachedReports(reports);
          setPendingCount(pending);
          setLastSyncedAt(lastSync);
        }
      } catch (err) {
        console.warn("[useOfflineSync] Error refreshing local data:", err);
      }
    };

    void initializeData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Reconnection auto-sync trigger:
  // Jika sebelumnya offline atau server unreachable, lalu status berubah menjadi 'online'
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && isOnline) {
      wasOfflineRef.current = false;
      void syncNow();
    }
  }, [isOnline, networkState.status, syncNow]);

  return {
    cachedReports,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    refreshLocalData,
    syncNow,
    addOfflineReport,
  };
}
