/**
 * Civic Pulse - Modul LBS
 * Architectural Type Definitions: Civic Reports & Incident Categories
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

import { Coordinate } from "./location";

export type CivicReportCategory =
  | "road-damage"
  | "flood"
  | "landslide"
  | "street-light";

export type CivicReportSeverity = "low" | "medium" | "high";

export type CivicReport = {
  id: string;
  title: string;
  category: CivicReportCategory;
  description: string;
  coordinate: Coordinate;
  createdAt: string;
  severity: CivicReportSeverity;
  /** Penanda eksplisit wajib integritas data pengujian */
  isSimulation: boolean;
};

