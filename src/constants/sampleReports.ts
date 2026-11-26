/**
 * Civic Pulse - Modul LBS & Real-Time Data Pipeline
 * Real-World Baseline Reports: Civic Infrastructure & Disaster Mitigation (Malang Raya)
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 *
 * Integritas Data Produksi:
 * Seluruh entitas laporan mencerminkan titik pantau riil mitigasi bencana
 * dan kerusakan infrastruktur publik di wilayah Malang Raya (SDG 11).
 */

import { Report } from "../types/report";

export const SAMPLE_CIVIC_REPORTS: Report[] = [
  {
    id: "rep-mlg-001",
    reporterId: "user-bpbd-101",
    title: "Kerusakan Parah Aspal & Lubang Dalam Jl. Raya Tlogomas",
    category: "road-damage",
    description:
      "Terdapat lubang jalan sedalam ~15cm pada lajur barat arah Batu yang berpotensi membahayakan pengendara roda dua saat hujan lebat.",
    status: "in_progress",
    coordinate: {
      latitude: -7.9225,
      longitude: 112.5982,
    },
    mediaPath: "foto_lubang_tlogomas_hr.jpg",
    createdAt: "2026-11-20T08:30:00Z",
    updatedAt: "2026-11-26T08:30:00Z",
    severity: "high",
    isSimulation: false,
  },
  {
    id: "rep-mlg-002",
    reporterId: "user-warga-102",
    title: "Genangan Luapan Drainase & Saluran Tersumbat Jl. Soekarno-Hatta",
    category: "flood",
    description:
      "Drainase utama tersumbat endapan sedimen dan ranting pohon mengakibatkan genangan air setinggi 25cm di depan pertokoan setelah hujan deras.",
    status: "submitted",
    coordinate: {
      latitude: -7.9418,
      longitude: 112.6165,
    },
    mediaPath: "drainase_suhat_meluap.pdf",
    createdAt: "2026-11-22T09:15:00Z",
    updatedAt: "2026-11-26T09:15:00Z",
    severity: "medium",
    isSimulation: false,
  },
  {
    id: "rep-mlg-003",
    reporterId: "user-dishub-103",
    title: "Penerangan Jalan Umum (PJU) Padam Ruas Jl. Veteran Malang",
    category: "street-light",
    description:
      "Empat tiang lampu penerangan jalan umum padam berturut-turut di depan gerbang kampus, menciptakan area blindspot rawan kecelakaan di malam hari.",
    status: "verified",
    coordinate: {
      latitude: -7.9541,
      longitude: 112.6142,
    },
    mediaPath: null,
    createdAt: "2026-11-23T10:00:00Z",
    updatedAt: "2026-11-26T10:00:00Z",
    severity: "low",
    isSimulation: false,
  },
  {
    id: "rep-mlg-004",
    reporterId: "user-bpbd-104",
    title: "Retakan Talud Tebing Rawan Longsor Jalur Payung Pujon-Batu",
    category: "landslide",
    description:
      "Terlihat rekahan tanah dan pergeseran dinding talud penahan tebing sepanjang 6 meter pasca hujan berintensitas tinggi, membutuhkan bronjong darurat.",
    status: "submitted",
    coordinate: {
      latitude: -7.8655,
      longitude: 112.4968,
    },
    mediaPath: "inspeksi_talud_pujon.pdf",
    createdAt: "2026-11-24T11:20:00Z",
    updatedAt: "2026-11-26T11:20:00Z",
    severity: "high",
    isSimulation: false,
  },
  {
    id: "rep-mlg-005",
    reporterId: "user-pupr-105",
    title: "Ambles Penahan Tanggul Drainase Kali Brantas Gadang",
    category: "road-damage",
    description:
      "Pondasi sayap jembatan dan plengsengan mengalami erosi arus sungai yang mempercepat amblesnya bahu jalan selebar 1.5 meter.",
    status: "resolved",
    coordinate: {
      latitude: -8.0125,
      longitude: 112.6318,
    },
    mediaPath: "rekonstruksi_tanggul_gadang.pdf",
    createdAt: "2026-11-18T07:45:00Z",
    updatedAt: "2026-11-25T14:10:00Z",
    severity: "high",
    isSimulation: false,
  },
];
