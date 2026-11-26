/**
 * Civic Pulse - Pertemuan 11–13
 * Service: RxJS Reactive Search & Filter Pipeline
 * Role: Anggota 1 (Naufal) & Anggota 2 (Syahril)
 *
 * Reliability & Immediate Update Safeguards:
 * 1. Debounced search (300ms) + distinctUntilChanged untuk pengetikan kata kunci.
 * 2. Immediate refresh & optimistic in-place report update (`applyImmediateReportUpdate`)
 *    agar klik tombol "Verifikasi", "Proses", dan "Selesai" langsung memperbarui UI (<16ms)
 *    tanpa terblokir oleh `distinctUntilChanged`!
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
  normalizeQuery,
} from "../../types/search";
import { Report } from "../../types/report";
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
        debounceTime(300),
        distinctUntilChanged(areSearchCriteriaEqual),
        switchMap((criteria) => {
          return this.executeSearch(criteria).pipe(
            startWith<SearchResultsState>({
              reports: this.resultsSubject.value.reports,
              loading: true,
              error: null,
              isFromCache: this.resultsSubject.value.isFromCache,
              criteria,
            }),
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
   * Eksekusi pencarian laporan melalui ReportRepository
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
   * Memperbarui satu item laporan di dalam stream secara instan (<16ms)
   * ketika pengguna menekan tombol "Verifikasi", "Proses", atau "Selesai",
   * atau ketika laporan baru ditambahkan.
   */
  applyImmediateReportUpdate(updatedReport: Report): void {
    const currentState = this.resultsSubject.value;
    const criteria = this.criteriaSubject.value;

    const norm = normalizeQuery(criteria.query);
    const matchesCategory =
      !criteria.category || criteria.category === "all" || updatedReport.category === criteria.category;
    const matchesStatus =
      !criteria.status || criteria.status === "all" || updatedReport.status === criteria.status;
    const matchesQuery =
      !norm ||
      updatedReport.title.toLowerCase().includes(norm) ||
      updatedReport.description.toLowerCase().includes(norm);

    const existsIndex = currentState.reports.findIndex((r) => r.id === updatedReport.id);
    let nextReports = [...currentState.reports];

    if (matchesCategory && matchesStatus && matchesQuery) {
      if (existsIndex >= 0) {
        nextReports[existsIndex] = updatedReport;
      } else {
        nextReports = [updatedReport, ...nextReports];
      }
    } else if (existsIndex >= 0) {
      // Jika filter status aktif (misal sedang filter 'submitted') dan status berubah ke 'verified', keluarkan dari filter tersebut
      nextReports.splice(existsIndex, 1);
    }

    this.resultsSubject.next({
      ...currentState,
      reports: nextReports,
      loading: false,
      error: null,
    });
  }

  /**
   * Stream observable hasil pencarian reaktif untuk dikonsumsi UI
   */
  get searchResults$(): Observable<SearchResultsState> {
    return this.resultsSubject.asObservable();
  }

  /**
   * Mengambil snapshot state pencarian saat ini secara sinkron
   */
  getSnapshot(): SearchResultsState {
    return this.resultsSubject.value;
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
   * Memicu refresh pencarian secara langsung tanpa terblokir oleh distinctUntilChanged
   */
  refresh(): void {
    const criteria = this.criteriaSubject.value;
    this.executeSearch(criteria)
      .pipe(
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
      )
      .subscribe((state) => {
        this.resultsSubject.next(state);
      });
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
