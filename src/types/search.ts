/**
 * Civic Pulse - Pertemuan 11
 * Architectural Contract: Reactive Search & Filter Criteria
 * Role: Anggota 1 (Senior System Architect & Security Engineer)
 */

import { CivicReportCategory, Report, ReportStatus } from "./report";

export type SearchCriteria = {
  query: string;
  category?: CivicReportCategory | "all";
  status?: ReportStatus | "all";
};

export type SearchResultsState = {
  reports: Report[];
  loading: boolean;
  error: string | null;
  isFromCache: boolean;
  criteria: SearchCriteria;
};

/**
 * Normalisasi query pencarian: trim dan hilangkan spasi berlebih
 */
export function normalizeQuery(q: string | null | undefined): string {
  if (!q) return "";
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Komparator untuk distinctUntilChanged pada pipeline RxJS
 * Membandingkan nilai isi kriteria, bukan sekadar referensi objek
 */
export function areSearchCriteriaEqual(
  a: SearchCriteria,
  b: SearchCriteria
): boolean {
  return (
    normalizeQuery(a.query) === normalizeQuery(b.query) &&
    (a.category || "all") === (b.category || "all") &&
    (a.status || "all") === (b.status || "all")
  );
}
