/**
 * Civic Pulse - Pertemuan 11
 * Architectural Contract: Network & Connectivity Types
 * Role: Anggota 3 (Lead Network, Offline Storage & Background Processing Engineer)
 */

export type ConnectionType = "wifi" | "cellular" | "ethernet" | "none" | "unknown";

export type NetworkStatus =
  | "online" // Terhubung ke jaringan dan backend server terjangkau
  | "connected-no-internet" // Terhubung ke Wi-Fi/Seluler tapi backend server tidak terjangkau
  | "offline" // Radio Wi-Fi/Seluler mati / terputus
  | "checking"; // Sedang memverifikasi status koneksi

export type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isBackendReachable: boolean | null;
  status: NetworkStatus;
  connectionType: ConnectionType;
  lastCheckedAt: string;
  message: string;
};

export interface INetworkStateService {
  getState(): NetworkState;
  checkReachability(): Promise<NetworkState>;
  subscribe(listener: (state: NetworkState) => void): () => void;
  destroy(): void;
}
