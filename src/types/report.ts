/**
 * Civic Pulse - Modul LBS & Real-Time Data Pipeline
 * Architectural Type Definitions: Civic Reports, Status & Incident Categories
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 */

import { Coordinate } from "./location";

export type CivicReportCategory =
  | "road-damage"
  | "flood"
  | "landslide"
  | "street-light";

export type CivicReportSeverity = "low" | "medium" | "high";

export type ReportStatus =
  | "submitted"
  | "verified"
  | "in_progress"
  | "resolved"
  | "rejected";

export type Report = {
  id: string;
  reporterId?: string | null;
  title: string;
  category: CivicReportCategory;
  description: string;
  status: ReportStatus;
  coordinate: Coordinate;
  mediaPath?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  severity: CivicReportSeverity;
  /** Penanda eksplisit integritas data pengujian */
  isSimulation: boolean;
};

/**
 * Backward compatibility alias untuk Pertemuan 9 dan 10
 */
export type CivicReport = Report;
