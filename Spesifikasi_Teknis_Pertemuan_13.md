# SPESIFIKASI TEKNIS CIVIC PULSE
## Pertemuan 13 — Milestone 5: AI Vibe Coding Refactoring, 16ms Profiling & Memory Leak Audit

**Sub-CPMK 11:** Mahasiswa mampu melakukan audit arsitektural, optimasi performa 60 FPS, dan evaluasi etika engineering (AIK).

### Deliverables
1. Refaktorisasi draft code menggunakan Antigravity IDE secara terkontrol.
2. Architect's Audit Protocol: Explicit Error Handling & Permissions; Graceful Fallbacks & Skeleton UI; Unsubscribe & Cleanup (Zero Memory Leak).
3. Profiling performa berdasarkan 16-Millisecond Mandate (React.memo, useMemo, useCallback digunakan secara selektif dan justified).
4. Polishing UI agar responsif, interaktif, konsisten, dan nyaman.
5. Hardening aplikasi berbasis Supabase nyata, tidak mengandalkan dummy data pada alur utama, menuju release candidate yang dapat diuji.

## 1. Tujuan dan Prinsip
Civic Pulse adalah aplikasi pelaporan kondisi lingkungan/infrastruktur dan informasi komunitas. Milestone 13 merupakan tahap refactoring, reliability, security, performance profiling, UX refinement, dan production-readiness review. Jangan menjanjikan production-ready absolut; status akhir harus berbasis bukti, test, blockers, dan risiko.

Audit sebelum coding. Refactor incremental, jangan rewrite total. Pertahankan fitur dan kontrak yang ada kecuali perubahan disepakati. Jangan mengubah schema/RLS/auth/API/migration secara sepihak. Jangan menyimpan service-role/secret Supabase key di mobile, repo, log, prompt AI, atau screenshots. Jangan log token, NIK, lokasi presisi, foto, atau PII. Permission diminta just-in-time, dengan rationale dan denial fallback. Error handling bukan sekadar console.log atau silent failure. Loading, empty, error, offline, stale cache, pending, dan success harus dibedakan. Cleanup harus explicit. Optimasi React berdasarkan profiling, bukan memoization massal.

## 2. Audit Baseline
Audit versi Expo/RN/React/TS/router/Reanimated/RxJS/NetInfo/SQLite/Supabase client; struktur UI/hooks/services/repositories/domain/storage; Supabase auth, schema, migrations, RLS, storage policies, realtime, environment; screens dan flow; dependency; test/lint/typecheck/build; hotspot render/list/map/image/query/subscriptions.
Buat matriks: **Area | Temuan | Risiko | Bukti | Prioritas | Rekomendasi**.

## 3. Architect's Audit Protocol

### Check 1 — Explicit Error Handling & Permissions
Audit auth/session, Supabase queries/mutations, upload/download, location, camera/gallery, filesystem, network, SQLite/outbox, realtime, tasks, form validation dan submit.
- Klasifikasikan error: validation, permission, network, timeout, auth/session, server, storage, conflict, unknown.
- Setiap async boundary memiliki handling; hindari empty catch, silent failure, unhandled promise rejection.
- Pesan user jelas, aman, dan actionable (retry, buka settings, simpan draft, kembali).
- Technical detail hanya pada logging aman; jangan log secrets/PII.
- Permission just-in-time; denial punya graceful path dan tidak memblokir fitur yang tidak terkait.
- Pertahankan input/draft saat error jika aman.
Checklist: empty catch? async handling? permission rationale/denial? actionable errors? sensitive logs?

### Check 2 — Graceful Fallbacks & Skeleton UI
Setiap screen data-driven harus membedakan initial loading, cached/stale, refreshing, success, empty, error, offline, permission denied, submitting, pending/queued, synced, partial failure.
- Skeleton hanya untuk loading awal yang sesuai, bukan empty/error.
- Cached data dipertahankan ketika refresh gagal bila memungkinkan; stale state harus jujur.
- Offline tidak berpura-pura online.
- Retry tidak membuat duplicate mutation.
- Form/draft tidak hilang karena network failure.
- Jangan tampilkan server-success sebelum konfirmasi server.
- Jika offline queue didukung, status queued/pending berbeda dari synced.

### Check 3 — Unsubscribe & Cleanup
Audit Supabase Realtime channels, RxJS subscriptions, NetInfo, location watchers, keyboard/event listeners, timers, background task registration, animation resources, requests/cancellation, screen/focus listeners.
Buat inventory: **Resource | Owner | Setup | Cleanup | Evidence**.
Verifikasi cleanup ketika screen ditinggalkan, rerender, reconnect, foreground/background. Hindari listener/channel ganda, stale result, timer tak terhapus, retained closures. Jangan klaim “zero memory leak” hanya dari code review; dokumentasikan evidence dan batasnya.

## 4. 16-Millisecond Mandate
16.67 ms/frame adalah budget teoritis untuk 60 FPS. Gunakan sebagai prinsip profiling, bukan klaim bahwa semua render wajib tepat di bawahnya.
Profil hotspot: rerenders, state/context luas, expensive filtering/sorting, list virtualization/keys, map markers, image, layout, Reanimated, query/refetch, duplicate subscription, UI/JS thread.
- React.memo: komponen yang props stabil dan profiling menunjukkan benefit.
- useMemo: computation mahal yang layak dicache.
- useCallback: callback identity berdampak pada child memoization/dependencies.
Tidak perlu memoize semuanya; hindari readability degradation dan dependency bugs.
Profiling report: **screen/flow | kondisi | gejala | tool/measurement | baseline | perubahan | hasil | tradeoff**. Jika profiler/benchmark tidak tersedia, nyatakan limitation dan observasi kualitatif yang reproducible. Jangan mengarang FPS, frame time, memory, atau improvement percentage.

## 5. Supabase Production Hardening
Verifikasi dev/staging/prod environment separation, client initialization, auth/session persistence/refresh, RLS setiap tabel yang diakses client, least privilege, ownership, storage bucket policies, signed URLs jika digunakan, pagination/limits, server-side validation, idempotency/duplicate prevention, realtime scope, migration/rollback/backup approach, dan error mapping.
- Service-role/secret key tidak boleh berada di client.
- Authorization tidak boleh hanya berdasarkan UI.
- RLS menjadi enforcement layer.
- Jangan expose report/private fields yang tidak berhak.
- File tidak public kecuali secara sadar dan disetujui.
- Raw backend errors tidak ditampilkan.
- Audit akses dengan skenario user-role yang memang tersedia.
- Status report transitions harus authoritative.
- Offline queue harus membedakan queued vs server-accepted; reconcile data setelah reconnect.
- Jangan mengubah schema/policy production tanpa review.

## 6. UX Polish
Perbaiki hierarchy, typography, spacing, density, color tokens, icon consistency, action hierarchy, touch target, form validation, loading/error/empty/offline states, keyboard/safe area, responsiveness, dan feedback sync/realtime. Fokus pada screen paling sering/critical, bukan redesign serentak tanpa rencana. Jaga accessibility, text scaling, screen readers, motion yang purpose-driven.

## 7. AI Vibe Coding Protocol
AI adalah assistant, bukan authority:
1. Minta AI menjelaskan kode/impact sebelum perubahan.
2. Batasi scope dan file.
3. Refactor kecil/incremental.
4. Review hasil AI line-by-line: logic, security, lifecycle, dependency, types.
5. Run typecheck/lint/tests dan manual scenarios.
6. Reject invented APIs, bypass RLS/service boundaries, secret exposure, validation removal, dependencies tanpa alasan.
7. Catat perubahan AI yang signifikan dan rationale.
Jangan masukkan secrets, PII, credentials, private logs, atau data laporan nyata ke prompt.

## 8. Production Readiness Gate
**Security:** no secrets in bundle; RLS/storage policies verified; sensitive logs absent; auth/permission denial tested.
**Reliability:** async errors handled; states distinct; queued/synced truthful; retries safe; cleanup evidence.
**Performance:** critical flows profiled; hotspots identified; memoization justified; list/map evaluated; no unsupported claims.
**Quality:** typecheck/lint/tests/build; device limitations; regression; accessibility basics.
**Operations:** migration/backup/rollback considerations; safe observability; release configuration; known issues.

## 9. Team Workstreams
**Naufal:** architecture/Supabase schema-RLS-auth-storage, security, error taxonomy, cleanup review, integration and release gate.
**Syahril:** UI polish/responsiveness, render profiling, selective memoization, skeleton/fallback, accessibility, keyboard/safe area.
**Robi:** device/platform validation, permission/lifecycle, offline/reconnect, resource cleanup evidence, reliability tests, performance evidence.

## 10. Urutan kerja
1. Naufal audit architecture/Supabase/security baseline and critical risks.
2. Syahril refactor/polish UI incrementally and profile hotspots.
3. Robi reliability/device/permission/offline/lifecycle testing and issue triage.
4. Naufal integrate, security/data integrity/regression/release review.
5. Team decide release-candidate status with blockers/risks.

## 11. Test matrix
| Area | Scenario | Expected |
|---|---|---|
| Auth | session expired | recoverable, safe feedback |
| Backend | network/server failure | fallback, no crash |
| Permission | deny/revoke location/camera | graceful alternative |
| Offline | launch without network | truthful cache/empty offline |
| Report | offline submit | queued only if supported; never falsely synced |
| Reconnect | queued data | reconciliation, no duplicate |
| Realtime | repeatedly enter/leave screen | no duplicate active channels |
| Search | rapid criteria changes | latest results win |
| List | large dataset | scroll remains usable |
| Map | many markers | profiling/optimization assessment |
| Form | validation/server error | user input retained where safe |
| Lifecycle | background/foreground | resources follow intended lifecycle |
| UI | rotate/font scaling | no overflow |
| Security | unauthorized role access | RLS denies |

## 12. Definition of Done
Incremental refactor preserves behavior; audit checks documented; critical async failures handled; permission denial graceful; fallback states truthful; cleanup explicit and tested to extent possible; performance profiling evidence honest; memoization selective; Supabase RLS/storage/auth reviewed; UI responsive/accessibility basics; tests and limitations recorded; no false production-readiness claim.

## 13. Final report
Executive summary/release status; environment baseline; architecture/Supabase findings; Check 1/2/3 results; cleanup inventory; profiling methods/results/caveats; React optimizations with rationale; UI changes; file list; test matrix; security review; blockers/deferred risks; recommendation: `READY FOR INTERNAL TEST`, `RELEASE CANDIDATE WITH BLOCKERS`, or `NOT READY`.
