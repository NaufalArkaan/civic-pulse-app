/**
 * Civic Pulse - Modul LBS
 * Architectural Contracts: Component Props for UI Layer (Anggota 2 - Syahril)
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

import { Coordinate, LocationStatus, MapRegion, TrackingMode } from "./location";
import { CivicReport } from "./report";

export type CivicMapProps = {
  region: MapRegion;
  userLocation: Coordinate | null;
  reports: CivicReport[];
  selectedReportId: string | null;
  onSelectReport: (report: CivicReport) => void;
  onMapPress?: () => void;
  mapRef: React.RefObject<any>;
};

export type UserMarkerProps = {
  coordinate: Coordinate;
  accuracy?: number | null;
  trackingMode: TrackingMode;
};

export type ReportMarkerProps = {
  report: CivicReport;
  isSelected: boolean;
  onPress: (report: CivicReport) => void;
};

export type SelectedReportCardProps = {
  report: CivicReport;
  userLocation: Coordinate | null;
  distanceFormatted: string;
  onClose: () => void;
};

export type MapControlsProps = {
  mode: TrackingMode;
  onModeChange: (mode: TrackingMode) => void;
  onRecenter: () => void;
  isRecenterDisabled: boolean;
};

export type LocationStatusBannerProps = {
  status: LocationStatus;
  error: string | null;
  permissionGranted: boolean;
  onRetry: () => void;
};

