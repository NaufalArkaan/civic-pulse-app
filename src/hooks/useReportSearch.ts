/**
 * Civic Pulse - Pertemuan 11
 * Hook: useReportSearch (RxJS Search Pipeline & Realtime Consumer)
 * Role: Anggota 1 & Anggota 2 (Syahril) Integration Baseline
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Report, CivicReportCategory, ReportStatus } from "../types/report";
import { SearchResultsState } from "../types/search";
import { SyncState } from "../types/sync";
import { NetworkState } from "../types/network";
import { reportSearchService } from "../services/reports/reportSearchService";
import { reportRealtimeService } from "../services/reports/reportRealtimeService";
import { reportRepository } from "../services/reports/reportRepository";
import { networkService } from "../services/network/networkService";
import { mockRealtimeProvider } from "../providers/realtime/MockRealtimeProvider";

export function useReportSearch() {
  const [searchState, setSearchState] = useState<SearchResultsState>({
    reports: [],
    loading: true,
    error: null,
    isFromCache: false,
    criteria: reportSearchService.getCriteria(),
  });

  const [networkState, setNetworkState] = useState<NetworkState>(
    networkService.getNetworkState()
  );

  const [syncState, setSyncState] = useState<SyncState>(
    reportRepository.getSyncState()
  );

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Mulai service real-time
    reportRealtimeService.start();

    // 2. Langganan ke stream hasil pencarian RxJS
    const searchSub = reportSearchService.searchResults$.subscribe((state) => {
      if (isMountedRef.current) {
        setSearchState(state);
      }
    });

    // 3. Langganan ke stream event realtime (pemicu refresh search otomatis)
    const realtimeSub = reportRealtimeService.events$.subscribe(() => {
      reportSearchService.refresh();
    });

    // 4. Langganan status jaringan NetInfo
    const networkSub = networkService.networkState$.subscribe((net) => {
      if (isMountedRef.current) {
        setNetworkState(net);
      }
      if (net.status === "reconnecting") {
        reportRepository.processOutbox().then(() => {
          reportSearchService.refresh();
        });
      }
    });

    // 5. Langganan status outbox sync
    const syncSub = reportRepository.syncState$.subscribe((sync) => {
      if (isMountedRef.current) {
        setSyncState(sync);
      }
    });

    // Initial search trigger
    reportSearchService.refresh();

    return () => {
      isMountedRef.current = false;
      searchSub.unsubscribe();
      realtimeSub.unsubscribe();
      networkSub.unsubscribe();
      syncSub.unsubscribe();
      reportRealtimeService.stop();
    };
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    reportSearchService.setCriteria({ query });
  }, []);

  const setCategoryFilter = useCallback((category: CivicReportCategory | "all") => {
    reportSearchService.setCriteria({ category });
  }, []);

  const setStatusFilter = useCallback((status: ReportStatus | "all") => {
    reportSearchService.setCriteria({ status });
  }, []);

  const refresh = useCallback(() => {
    reportSearchService.refresh();
  }, []);

  const createReport = useCallback(
    async (newReportData: Omit<Report, "id" | "createdAt" | "updatedAt">) => {
      const res = await reportRepository.createReport(newReportData);
      reportSearchService.refresh();
      return res.success;
    },
    []
  );

  const updateReportStatus = useCallback(
    async (id: string, status: ReportStatus) => {
      const res = await reportRepository.updateReportStatus(id, status);
      reportSearchService.refresh();
      return res.success;
    },
    []
  );

  const processOutbox = useCallback(async () => {
    const count = await reportRepository.processOutbox();
    reportSearchService.refresh();
    return count;
  }, []);

  /**
   * Helper untuk menyimulasikan laporan masuk via real-time stream (demonstrasi lab)
   */
  const simulateIncomingReport = useCallback(() => {
    const randomId = Math.floor(Math.random() * 900) + 100;
    const simReport: Report = {
      id: `rep-rt-${Date.now()}`,
      reporterId: `user-rt-${randomId}`,
      title: `[Realtime #${randomId}] Tanggul Jebol & Banjir Luapan`,
      category: "flood",
      description: `[Data Realtime Live] Terdeteksi kenaikan debit air setinggi 40cm pada saluran irigasi pukul ${new Date().toLocaleTimeString("id-ID")}.`,
      status: "submitted",
      coordinate: {
        latitude: -7.923 + (Math.random() - 0.5) * 0.01,
        longitude: 112.601 + (Math.random() - 0.5) * 0.01,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      severity: "high",
      isSimulation: true,
    };

    mockRealtimeProvider.emitSimulatedEvent("INSERT", simReport);
  }, []);

  return {
    reports: searchState.reports,
    loading: searchState.loading,
    error: searchState.error,
    isFromCache: searchState.isFromCache,
    criteria: searchState.criteria,
    networkState,
    syncState,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    refresh,
    createReport,
    updateReportStatus,
    processOutbox,
    simulateIncomingReport,
  };
}
