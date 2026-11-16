/**
 * Civic Pulse - Modul LBS & Document Vault
 * Architectural Contracts: Component Props for UI Layer (Anggota 2 - Syahril)
 * Role: Anggota 1 (Lead System Architect) & Anggota 2 (Lead Frontend & Performance Specialist)
 */

import React from "react";
import { EdgeInsets } from "react-native-safe-area-context";
import { Coordinate, LocationStatus, MapRegion, TrackingMode } from "./location";
import { CivicReport } from "./report";
import { VaultFile } from "./vault";

/* =========================================================================
 * Pertemuan 9: Modul LBS & Interactive Mapping Components
 * ========================================================================= */

export type CivicMapProps = {
  region: MapRegion;
  userLocation: Coordinate | null;
  reports: CivicReport[];
  selectedReportId: string | null;
  onSelectReport: (report: CivicReport) => void;
  onMapPress?: () => void;
  mapRef: React.RefObject<any>;
  trackingMode?: TrackingMode;
  accuracy?: number | null;
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
  onFocusReport?: (report: CivicReport) => void;
  insets?: EdgeInsets;
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

/* =========================================================================
 * Pertemuan 10: Modul Document Vault & Scoped Storage Components
 * ========================================================================= */

export type VaultHeaderProps = {
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  totalFiles?: number;
  totalSizeBytes?: number;
};

export type VaultFileItemProps = {
  item: VaultFile;
  onOpen: (file: VaultFile) => void;
  onDelete: (id: string) => void;
};

export type VaultFileListProps = {
  files: VaultFile[];
  onOpenFile: (file: VaultFile) => void;
  onDeleteFile: (id: string) => void;
  onImportDocument: () => void;
  onCreateDemoReport: () => void;
  isImporting?: boolean;
};

export type VaultEmptyStateProps = {
  onImportDocument: () => void;
  onCreateDemoReport: () => void;
  isImporting?: boolean;
};

export type VaultFilePreviewModalProps = {
  file: VaultFile | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
};

export type VaultJitModalProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  actionType?: "import" | "camera" | "storage";
};
