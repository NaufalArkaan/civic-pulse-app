/**
 * Civic Pulse - Modul LBS & Real-Time Data Pipeline
 * Mock Data: Sample Civic Infrastructure Reports
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 *
 * Catatan Keamanan & Integritas Data:
 * Semua entitas di bawah ini adalah DATA SIMULASI (Demonstration Only)
 * untuk pengujian fitur mapping, search/filter RxJS, dan sinkronisasi real-time.
 */

import { Report } from "../types/report";

export const SAMPLE_CIVIC_REPORTS: Report[] = [
  {
    id: "rep-sim-001",
    reporterId: "user-sim-101",
    title: "[Data Simulasi] Jalan Berlubang Parah",
    category: "road-damage",
    description:
      "[Data Simulasi] Terdapat lubang sedalam ~15cm pada lajur kiri yang berpotensi membahayakan pengendara roda dua saat hujan.",
    status: "in_progress",
    coordinate: {
      latitude: -7.9225,
      longitude: 112.5982,
    },
    mediaPath: null,
    createdAt: "2026-11-09T08:30:00Z",
    updatedAt: "2026-11-16T08:30:00Z",
    severity: "high",
    isSimulation: true,
  },
  {
    id: "rep-sim-002",
    reporterId: "user-sim-102",
    title: "[Data Simulasi] Genangan Air & Saluran Tersumbat",
    category: "flood",
    description:
      "[Data Simulasi] Drainase tersumbat sampah ranting pohon mengakibatkan genangan setinggi 20cm di tepi jalan utama.",
    status: "submitted",
    coordinate: {
      latitude: -7.9198,
      longitude: 112.6015,
    },
    mediaPath: null,
    createdAt: "2026-11-09T09:15:00Z",
    updatedAt: "2026-11-16T09:15:00Z",
    severity: "medium",
    isSimulation: true,
  },
  {
    id: "rep-sim-003",
    reporterId: "user-sim-103",
    title: "[Data Simulasi] Penerangan Jalan Umum Padam",
    category: "street-light",
    description:
      "[Data Simulasi] Dua tiang lampu PJU mati total sejak 3 hari lalu, menciptakan titik gelap rawan kecelakaan.",
    status: "verified",
    coordinate: {
      latitude: -7.9241,
      longitude: 112.6022,
    },
    mediaPath: null,
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-16T10:00:00Z",
    severity: "low",
    isSimulation: true,
  },
  {
    id: "rep-sim-004",
    reporterId: "user-sim-104",
    title: "[Data Simulasi] Retakan Talud Tebing Rawan Longsor",
    category: "landslide",
    description:
      "[Data Simulasi] Terlihat rekahan tanah sepanjang 4 meter pada tebing penahan jalan pasca hujan lebat semalam.",
    status: "submitted",
    coordinate: {
      latitude: -7.9175,
      longitude: 112.5968,
    },
    mediaPath: null,
    createdAt: "2026-11-09T11:20:00Z",
    updatedAt: "2026-11-16T11:20:00Z",
    severity: "high",
    isSimulation: true,
  },
];
