/**
 * Civic Pulse - Pertemuan 11
 * Service: Network State Monitoring & Reconnect Detection
 * Role: Anggota 1 & Anggota 3 (Robi) Integration Baseline
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { BehaviorSubject, Observable } from "rxjs";
import { NetworkState } from "../../types/sync";

class NetworkService {
  private networkSubject = new BehaviorSubject<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    status: "online",
    type: "wifi",
  });

  private unsubscribeNetInfo: (() => void) | null = null;
  private isSimulatedOverride = false;

  constructor() {
    this.init();
  }

  private init() {
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      if (this.isSimulatedOverride) return;

      const isConnected = Boolean(state.isConnected);
      const isInternetReachable = state.isInternetReachable ?? isConnected;

      const previousStatus = this.networkSubject.value.status;
      const currentStatus =
        isConnected && isInternetReachable !== false ? "online" : "offline";

      // Deteksi reconnect (dari offline ke online)
      const nextStatus =
        previousStatus === "offline" && currentStatus === "online"
          ? "reconnecting"
          : currentStatus;

      this.networkSubject.next({
        isConnected,
        isInternetReachable,
        status: nextStatus,
        type: state.type,
      });

      // Transisi dari reconnecting ke online normal setelah jeda singkat
      if (nextStatus === "reconnecting") {
        setTimeout(() => {
          if (!this.isSimulatedOverride) {
            this.networkSubject.next({
              ...this.networkSubject.value,
              status: "online",
            });
          }
        }, 1500);
      }
    });
  }

  /**
   * Observable stream status jaringan
   */
  get networkState$(): Observable<NetworkState> {
    return this.networkSubject.asObservable();
  }

  /**
   * Mengambil snapshot status jaringan terkini secara sinkron
   */
  getNetworkState(): NetworkState {
    return this.networkSubject.value;
  }

  /**
   * Override simulasi jaringan untuk pengujian offline/online di demo lab
   */
  simulateNetworkState(status: "online" | "offline" | "reconnecting"): void {
    this.isSimulatedOverride = true;
    const isOnline = status !== "offline";
    this.networkSubject.next({
      isConnected: isOnline,
      isInternetReachable: isOnline,
      status,
      type: isOnline ? "simulated-online" : "none",
    });
  }

  /**
   * Mengembalikan ke mode pembacaan sensor NetInfo native
   */
  resetSimulatedOverride(): void {
    this.isSimulatedOverride = false;
    NetInfo.fetch().then((state) => {
      this.networkSubject.next({
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable ?? Boolean(state.isConnected),
        status: state.isConnected ? "online" : "offline",
        type: state.type,
      });
    });
  }

  /**
   * Cleanup listener saat lifecycle berakhir
   */
  cleanup(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }
}

export const networkService = new NetworkService();
