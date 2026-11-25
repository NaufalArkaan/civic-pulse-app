/**
 * Civic Pulse - Pertemuan 11
 * Service: RxJS Reactive Search & Filter Pipeline
 * Role: Anggota 1 & Anggota 2 (Syahril) Integration Baseline
 *
 * RxJS Pipeline Specification:
 * criteria$.pipe(
 *   debounceTime(300),
 *   distinctUntilChanged(areSearchCriteriaEqual),
 *   switchMap((criteria) => executeSearch(criteria))
 * )
 *
 * Reliability & UX Safeguards:
 * 1. Query dinormalisasi (trim & lowercase) sebelum komparasi distinct.
 * 2. switchMap membatalkan hasil pencarian lama saat kriteria baru masuk.
 * 3. catchError di inner observable memastikan stream TIDAK PERNAH mati saat terjadi error.
 * 4. Fallback transparan ke cache SQLite saat offline dengan penanda isFromCache.
 */

import {
  BehaviorSubject,
  Observable,
  of,
  Subscription,
} from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  startWith,
} from "rxjs/operators";
import {
  SearchCriteria,
  SearchResultsState,
  areSearchCriteriaEqual,
} from "../../types/search";
import { reportRepository } from "./reportRepository";
import { classifyAppError } from "../../utils/errorTaxonomy";

const INITIAL_CRITERIA: SearchCriteria = {
  query: "",
  category: "all",
  status: "all",
};

export class ReportSearchService {
  private criteriaSubject = new BehaviorSubject<SearchCriteria>(INITIAL_CRITERIA);
  private resultsSubject = new BehaviorSubject<SearchResultsState>({
    reports: [],
    loading: false,
    error: null,
    isFromCache: false,
    criteria: INITIAL_CRITERIA,
  });

  private pipelineSubscription: Subscription | null = null;

  constructor() {
    this.initPipeline();
  }

  private initPipeline(): void {
    this.pipelineSubscription = this.criteriaSubject
      .pipe(
        // 1. Debounce 300ms untuk mencegah request berlebihan saat mengetik cepat
        debounceTime(300),
        // 2. Distinct comparator: hanya kirim jika nilai query/filter berubah secara substantif
        distinctUntilChanged(areSearchCriteriaEqual),
        // 3. switchMap: membatalkan request lama ketika ada query baru
        switchMap((criteria) => {
          return this.executeSearch(criteria).pipe(
            // Loading state saat pencarian baru dimulai
            startWith<SearchResultsState>({
              reports: this.resultsSubject.value.reports,
              loading: true,
              error: null,
              isFromCache: false,
              criteria,
            }),
            // Tangani error di inner observable agar stream utama tidak berhenti
            // Pertahankan data cache yang sudah ada agar layar tidak kosong saat refresh gagal (Check 2)
            catchError((err) => {
              const previousReports = this.resultsSubject.value.reports;
              const classified = classifyAppError(err);
              return of<SearchResultsState>({
                reports: previousReports,
                loading: false,
                error: classified.userMessage,
                isFromCache: previousReports.length > 0,
                criteria,
              });
            })
          );
        })
      )
      .subscribe((state) => {
        this.resultsSubject.next(state);
      });
  }

  /**
   * Eksekusi pencarian laporan melalui ReportRepository (Supabase PostgREST -> Fallback SQLite Cache)
   */
  private executeSearch(criteria: SearchCriteria): Observable<SearchResultsState> {
    return of(null).pipe(
      switchMap(async () => {
        const res = await reportRepository.getReports(criteria);
        if (!res.success || !res.data) {
          throw new Error(res.error || "Gagal memuat laporan.");
        }

        return {
          reports: res.data,
          loading: false,
          error: null,
          isFromCache: Boolean(res.isFromCache),
          criteria,
        };
      })
    );
  }

  /**
   * Stream observable hasil pencarian reaktif untuk dikonsumsi UI
   */
  get searchResults$(): Observable<SearchResultsState> {
    return this.resultsSubject.asObservable();
  }

  /**
   * Mengubah query atau kriteria filter
   */
  setCriteria(update: Partial<SearchCriteria>): void {
    const nextCriteria: SearchCriteria = {
      ...this.criteriaSubject.value,
      ...update,
    };
    this.criteriaSubject.next(nextCriteria);
  }

  /**
   * Mengambil kriteria saat ini
   */
  getCriteria(): SearchCriteria {
    return this.criteriaSubject.value;
  }

  /**
   * Memicu refresh ulang pencarian secara manual
   */
  refresh(): void {
    this.criteriaSubject.next({ ...this.criteriaSubject.value });
  }

  /**
   * Membersihkan subscription saat komponen / service di-unmount
   */
  cleanup(): void {
    if (this.pipelineSubscription) {
      this.pipelineSubscription.unsubscribe();
      this.pipelineSubscription = null;
    }
  }
}

export const reportSearchService = new ReportSearchService();
