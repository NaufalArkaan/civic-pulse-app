/**
 * Civic Pulse - Pertemuan 11
 * Service: NetworkStateService (Centralized Network & Backend Reachability Monitor)
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 *
 * Core Principles:
 * 1. Membedakan secara eksplisit antara "perangkat terhubung ke jaringan" (radio aktif)
 *    dan "backend server dapat dijangkau" (reachability probe).
 * 2. Menghindari ping berulang pada setiap render via throttling & debounce terpusat (5 detik).
 * 3. Mengelola lifecycle listener NetInfo secara terpusat dengan mekanisme cleanup ketat.
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from "@react-native-community/netinfo";
import {
  ConnectionType,
  INetworkStateService,
  NetworkState,
  NetworkStatus,
} from "../../types/network";

const PROBE_TIMEOUT_MS = 3000;
const PROBE_THROTTLE_MS = 5000;
// Endpoint simulasi backend / reliable gateway check
const DEFAULT_HEALTH_CHECK_URL = "https://clients3.google.com/generate_204";

export class NetworkStateService implements INetworkStateService {
  private currentState: NetworkState;
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  private lastProbeTime = 0;
  private isProbing = false;

  constructor() {
    this.currentState = {
      isConnected: true,
      isInternetReachable: null,
      isBackendReachable: null,
      status: "checking",
      connectionType: "unknown",
      lastCheckedAt: new Date().toISOString(),
      message: "Sedang memverifikasi status koneksi jaringan...",
    };

    this.init();
  }

  private init() {
    // Listener perubahan status jaringan fisik perangkat
    this.netInfoUnsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      this.handleNetInfoChange(netState);
    });

    // Ambil status awal saat inisialisasi
    NetInfo.fetch().then((netState) => {
      this.handleNetInfoChange(netState);
    });
  }

  private handleNetInfoChange(netState: NetInfoState) {
    const isConnected = Boolean(netState.isConnected);
    const connType = this.mapConnectionType(netState.type);

    if (!isConnected) {
      // Jika radio jaringan mati, jangan membuang daya untuk ping
      this.updateState({
        isConnected: false,
        isInternetReachable: false,
        isBackendReachable: false,
        status: "offline",
        connectionType: connType,
        message: "Perangkat dalam keadaan offline. Mode lokal aktif.",
      });
      return;
    }

    // Jika perangkat terhubung ke Wi-Fi / Seluler, lakukan verifikasi reachability terkendali
    this.checkReachability();
  }

  /**
   * Melakukan verifikasi backend reachability dengan pembatasan frekuensi (throttling)
   */
  async checkReachability(pingUrl = DEFAULT_HEALTH_CHECK_URL): Promise<NetworkState> {
    const now = Date.now();

    // Throttle check: hindari probe berulang kurang dari 5 detik
    if (this.isProbing || now - this.lastProbeTime < PROBE_THROTTLE_MS) {
      return this.currentState;
    }

    this.isProbing = true;
    this.lastProbeTime = now;

    try {
      const netState = await NetInfo.fetch();
      const isConnected = Boolean(netState.isConnected);
      const connType = this.mapConnectionType(netState.type);

      if (!isConnected) {
        this.isProbing = false;
        return this.updateState({
          isConnected: false,
          isInternetReachable: false,
          isBackendReachable: false,
          status: "offline",
          connectionType: connType,
          message: "Koneksi jaringan terputus.",
        });
      }

      // Verifikasi konektivitas internet / backend via lightweight probe (HEAD/GET 204)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

      let isReachable = false;
      try {
        const response = await fetch(pingUrl, {
          method: "HEAD",
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        isReachable = response.ok || response.status === 204;
      } catch {
        clearTimeout(timeoutId);
        isReachable = false;
      }

      const status: NetworkStatus = isReachable ? "online" : "connected-no-internet";
      const message = isReachable
        ? `Terhubung online via ${connType.toUpperCase()}. Sinkronisasi aktif.`
        : `Terhubung ke ${connType.toUpperCase()}, namun server belum dapat dijangkau.`;

      this.isProbing = false;
      return this.updateState({
        isConnected: true,
        isInternetReachable: isReachable,
        isBackendReachable: isReachable,
        status,
        connectionType: connType,
        message,
      });
    } catch {
      this.isProbing = false;
      return this.updateState({
        isConnected: this.currentState.isConnected,
        isInternetReachable: false,
        isBackendReachable: false,
        status: "connected-no-internet",
        connectionType: this.currentState.connectionType,
        message: "Gagal memverifikasi status internet.",
      });
    }
  }

  private updateState(partial: Partial<NetworkState>): NetworkState {
    this.currentState = {
      ...this.currentState,
      ...partial,
      lastCheckedAt: new Date().toISOString(),
    };

    // Broadcast ke seluruh komponen UI yang berlangganan
    this.notifyListeners();
    return this.currentState;
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch {
        // Cegah unhandled error pada listener UI
      }
    });
  }

  getState(): NetworkState {
    return this.currentState;
  }

  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);
    // Kirimkan state saat ini seketika saat baru mendaftar
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private mapConnectionType(type: string): ConnectionType {
    switch (type.toLowerCase()) {
      case "wifi":
        return "wifi";
      case "cellular":
        return "cellular";
      case "ethernet":
        return "ethernet";
      case "none":
        return "none";
      default:
        return "unknown";
    }
  }

  destroy() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const networkStateService = new NetworkStateService();
