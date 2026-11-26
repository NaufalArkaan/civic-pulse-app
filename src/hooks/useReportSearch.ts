/**
 * Civic Pulse - Pertemuan 11–13
 * Hook: useReportSearch (RxJS Search Pipeline & Realtime Consumer)
 * Role: Anggota 1 (Naufal) & Anggota 2 (Syahril)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { networkService } from "../services/network/networkService";
import { reportRealtimeService } from "../services/reports/reportRealtimeService";
import { reportRepository } from "../services/reports/reportRepository";
import { reportSearchService } from "../services/reports/reportSearchService";
import { NetworkState } from "../types/network";
import { CivicReportCategory, Report, ReportStatus } from "../types/report";
import { SearchResultsState } from "../types/search";
import { SyncState } from "../types/sync";

export function useReportSearch() {
  const [searchState, setSearchState] = useState<SearchResultsState>({
    reports: [],
    loading: true,
    error: null,
    isFromCache: false,
    criteria: reportSearchService.getCriteria(),
  });

  const [networkState, setNetworkState] = useState<NetworkState>(
    networkService.getNetworkState(),
  );

  const [syncState, setSyncState] = useState<SyncState>(
    reportRepository.getSyncState(),
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
    const realtimeSub = reportRealtimeService.events$.subscribe((evt) => {
      if (evt.report && (evt.type === "INSERT" || evt.type === "UPDATE")) {
        reportSearchService.applyImmediateReportUpdate(evt.report);
      } else {
        reportSearchService.refresh();
      }
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

  const setCategoryFilter = useCallback(
    (category: CivicReportCategory | "all") => {
      reportSearchService.setCriteria({ category });
    },
    [],
  );

  const setStatusFilter = useCallback((status: ReportStatus | "all") => {
    reportSearchService.setCriteria({ status });
  }, []);

  const refresh = useCallback(() => {
    reportSearchService.refresh();
  }, []);

  const createReport = useCallback(
    async (newReportData: Omit<Report, "id" | "createdAt" | "updatedAt">) => {
      const res = await reportRepository.createReport(newReportData);
      if (res.success && res.data) {
        reportSearchService.applyImmediateReportUpdate(res.data);
      }
      return res;
    },
    [],
  );

  const updateReportStatus = useCallback(
    async (id: string, status: ReportStatus) => {
      const res = await reportRepository.updateReportStatus(id, status);
      if (res.success && res.data) {
        // Langsung perbarui state list (<16ms) agar tombol berubah seketika
        reportSearchService.applyImmediateReportUpdate(res.data);
      }
      return res;
    },
    [],
  );

  const processOutbox = useCallback(async () => {
    const count = await reportRepository.processOutbox();
    reportSearchService.refresh();
    return count;
  }, []);

  /**
   * Menambahkan laporan insiden darurat baru ke database & feed live
   */
  const simulateIncomingReport = useCallback(async () => {
    const MALANG_HOTSPOTS = [
      { lat: -7.9418, lng: 112.6165, title: "Genangan Luapan Drainase Jl. Soekarno-Hatta", category: "flood" as const },
      { lat: -7.9541, lng: 112.6142, title: "Lampu Penerangan PJU Padam Jl. Veteran", category: "street-light" as const },
      { lat: -7.9225, lng: 112.5982, title: "Aspal Ambles & Lubang Parah Jl. Raya Tlogomas", category: "road-damage" as const },
      { lat: -7.8655, lng: 112.4968, title: "Retakan Dinding Tebing Longsor Jalur Payung Pujon-Batu", category: "landslide" as const },
      { lat: -8.0125, lng: 112.6318, title: "Kerusakan Talud Penahan Jembatan Gadang", category: "road-damage" as const },
    ];
    const hotspotIndex = Math.floor(Date.now() / 1000) % MALANG_HOTSPOTS.length;
    const hotspot = MALANG_HOTSPOTS[hotspotIndex];

    const res = await reportRepository.createReport({
      title: hotspot.title,
      category: hotspot.category,
      description: `Laporan resmi terverifikasi tim lapangan di titik koordinat ${hotspot.lat}, ${hotspot.lng}. Dicatat pada pukul ${new Date().toLocaleTimeString(
        "id-ID",
      )}. Membutuhkan verifikasi teknis dan tindak lanjut penanganan instansi terkait.`,
      status: "submitted",
      coordinate: {
        latitude: hotspot.lat,
        longitude: hotspot.lng,
      },
      severity: "high",
      isSimulation: false,
    });

    if (res.success && res.data) {
      reportSearchService.applyImmediateReportUpdate(res.data);
    }
  }, []);

  return {
    reports: searchState.reports,
    loading: searchState.loading,
    error: searchState.error,
    isFromCache: searchState.isFromCache,
    criteria: searchState.criteria,
    networkState,
    syncState,
    activeProviderName: reportRealtimeService.getActiveProviderName(),
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
