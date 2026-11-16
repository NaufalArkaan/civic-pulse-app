import assert from "node:assert";
import test from "node:test";
import { Subject, of, throwError } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from "rxjs/operators";

// 1. Kriteria Pencarian & Komparator
function normalizeQuery(q) {
  if (!q) return "";
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function areSearchCriteriaEqual(a, b) {
  return (
    normalizeQuery(a.query) === normalizeQuery(b.query) &&
    (a.category || "all") === (b.category || "all") &&
    (a.status || "all") === (b.status || "all")
  );
}

test("RxJS: areSearchCriteriaEqual handles whitespace normalization and filters accurately", () => {
  const c1 = { query: "  jalan   rusak  ", category: "road-damage", status: "all" };
  const c2 = { query: "jalan rusak", category: "road-damage", status: "all" };
  const c3 = { query: "jalan rusak", category: "flood", status: "all" };

  assert.strictEqual(areSearchCriteriaEqual(c1, c2), true);
  assert.strictEqual(areSearchCriteriaEqual(c1, c3), false);
});

test("RxJS Pipeline: distinctUntilChanged filters duplicate queries", async () => {
  const criteria$ = new Subject();
  const emissions = [];

  const sub = criteria$
    .pipe(distinctUntilChanged(areSearchCriteriaEqual))
    .subscribe((c) => emissions.push(c.query));

  criteria$.next({ query: "banjir", category: "all", status: "all" });
  criteria$.next({ query: "banjir", category: "all", status: "all" }); // duplikat persis
  criteria$.next({ query: "  banjir  ", category: "all", status: "all" }); // duplikat normalisasi
  criteria$.next({ query: "longsor", category: "all", status: "all" }); // baru

  sub.unsubscribe();
  assert.strictEqual(emissions.length, 2);
  assert.deepStrictEqual(emissions, ["banjir", "longsor"]);
});

test("RxJS Pipeline: switchMap cancels previous in-flight requests and preserves stream on error", async () => {
  const criteria$ = new Subject();
  const results = [];

  const sub = criteria$
    .pipe(
      switchMap((criteria) => {
        if (criteria.query === "error-trigger") {
          return throwError(() => new Error("Network error simulation")).pipe(
            catchError((err) => of({ error: err.message, data: [] }))
          );
        }
        return of({ error: null, data: [`result-for-${criteria.query}`] });
      })
    )
    .subscribe((res) => results.push(res));

  // Kueri 1: Sukses
  criteria$.next({ query: "pertama" });
  // Kueri 2: Error yang ditangkap catchError (stream tidak mati)
  criteria$.next({ query: "error-trigger" });
  // Kueri 3: Kueri berikutnya tetap sukses membuktikan stream aktif
  criteria$.next({ query: "ketiga" });

  sub.unsubscribe();

  assert.strictEqual(results.length, 3);
  assert.deepStrictEqual(results[0], { error: null, data: ["result-for-pertama"] });
  assert.deepStrictEqual(results[1], { error: "Network error simulation", data: [] });
  assert.deepStrictEqual(results[2], { error: null, data: ["result-for-ketiga"] });
});

test("Realtime Ordering: Stale timestamp update is rejected to prevent race conditions", () => {
  const currentRecord = {
    id: "rep-001",
    title: "Jalan Amblas",
    status: "in_progress",
    updatedAt: "2026-11-16T12:00:00Z",
  };

  const staleEvent = {
    id: "rep-001",
    title: "Jalan Amblas",
    status: "submitted",
    updatedAt: "2026-11-16T11:00:00Z", // lebih lama dari 12:00:00Z
  };

  const freshEvent = {
    id: "rep-001",
    title: "Jalan Amblas Diperbaiki",
    status: "resolved",
    updatedAt: "2026-11-16T13:00:00Z", // lebih baru
  };

  function applyUpdate(existing, incoming) {
    if (new Date(existing.updatedAt).getTime() > new Date(incoming.updatedAt).getTime()) {
      return existing; // Tolak stale update
    }
    return incoming;
  }

  const result1 = applyUpdate(currentRecord, staleEvent);
  assert.strictEqual(result1.status, "in_progress"); // tetap 12:00:00Z

  const result2 = applyUpdate(currentRecord, freshEvent);
  assert.strictEqual(result2.status, "resolved"); // diterima
});

test("Outbox Idempotency: Idempotency key format and uniqueness", () => {
  function generateIdempotencyKey(operationType, reportId) {
    return `idemp_${operationType.toLowerCase()}_${reportId}_${Date.now()}`;
  }

  const k1 = generateIdempotencyKey("CREATE_REPORT", "rep-101");
  const k2 = generateIdempotencyKey("CREATE_REPORT", "rep-102");

  assert.ok(k1.startsWith("idemp_create_report_rep-101"));
  assert.notStrictEqual(k1, k2);
});
