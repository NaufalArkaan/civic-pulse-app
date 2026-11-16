/**
 * Civic Pulse - Pertemuan 11
 * Hook: useNetworkState (Centralized Network & Reachability Hook)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Menyediakan status jaringan reaktif ke lapisan UI tanpa membuat listener ganda.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { NetworkState } from "../types/network";
import { networkStateService } from "../services/network/networkStateService";

export function useNetworkState() {
  const [networkState, setNetworkState] = useState<NetworkState>(() =>
    networkStateService.getState()
  );
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Berlangganan ke service jaringan terpusat
    const unsubscribe = networkStateService.subscribe((state) => {
      if (isMountedRef.current) {
        setNetworkState(state);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const refreshNetworkState = useCallback(async () => {
    return await networkStateService.checkReachability();
  }, []);

  return {
    ...networkState,
    networkState,
    isOnline: networkState.status === "online",
    isOffline: networkState.status === "offline",
    isServerUnreachable: networkState.status === "connected-no-internet",
    refreshNetworkState,
  };
}
