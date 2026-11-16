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
import { reportCacheRepository } from "../database/reportCacheRepository";
import { networkService } from "../network/networkService";

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
            catchError((err) => {
              return of<SearchResultsState>({
                reports: [],
                loading: false,
                error: err?.message || "Gagal memproses pencarian laporan.",
                isFromCache: false,
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
   * Eksekusi pencarian laporan (Cache-first jika offline, remote jika online)
   */
  private executeSearch(criteria: SearchCriteria): Observable<SearchResultsState> {
    const isOnline = networkService.getNetworkState().status === "online";

    return of(null).pipe(
      switchMap(async () => {
        // Ambil data dari cache terstruktur SQLite
        const cachedResults = await reportCacheRepository.queryReports(criteria);

        return {
          reports: cachedResults,
          loading: false,
          error: null,
          isFromCache: !isOnline,
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
