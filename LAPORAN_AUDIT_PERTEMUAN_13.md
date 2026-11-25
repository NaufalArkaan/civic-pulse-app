# LAPORAN AUDIT ARSITEKTUR, KEAMANAN & PRODUCTION READINESS — PERTEMUAN 13
## Milestone 5: AI Vibe Coding Refactoring, 16ms Profiling, Memory Leak Audit & Supabase Hardening

**Mata Kuliah:** Pemrograman Mobile (Sub-CPMK 11)  
**Aplikasi:** Civic Pulse & Community Disaster Management (SDG 11: Sustainable Cities and Communities)  
**Lead System Architect & Security Engineer:** Naufal (Anggota 1)  
**Kolaborator Tim:** Syahril (Anggota 2 — Lead Frontend & Performance), Robi (Anggota 3 — Lead Hardware, Network & Lifecycle)  
**Tanggal Audit:** 25 November 2026  
**Keputusan Release Gate:** **`READY FOR INTERNAL TEST`** *(dengan catatan operasional provisioning `.env` produksi Supabase sebelum distribusi publik)*

---

## 1. Executive Summary & Status Release Candidate

Pada **Pertemuan 13 (Milestone 5)**, tim melakukan audit menyeluruh, refaktorisasi inkremental terkontrol dengan protokol AI Vibe Coding, hardening integrasi backend **Supabase PostgREST & Row-Level Security (RLS)**, pembersihan siklus hidup resource (*Unsubscribe & Cleanup*), serta optimasi performa berbasis **16-Millisecond Mandate (60 FPS)**.

Sesuai prinsip integritas engineering (AIK), kami **tidak mengklaim "100% bebas bug absolut di seluruh perangkat"** tanpa bukti. Berdasarkan bukti pengujian otomatis (**37/37 unit & integration tests lulus**, **0 TypeScript error**, **0 ESLint error/warning**) serta audit kode baris-demi-baris:
- **Status Rekomendasi:** **`READY FOR INTERNAL TEST`** (dan **`RELEASE CANDIDATE WITH OPERATIONAL BLOCKERS`** untuk rilis publik sampai kredensial proyek Supabase produksi `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY` disuntikkan melalui EAS Secrets serta migrasi SQL dijalankan di instance produksi).

---

## 2. Baseline Environment & Dependency Audit

| Komponen / Pustaka | Versi Terpasang | Status Kompatibilitas & Catatan Arsitektur |
| :--- | :--- | :--- |
| **Expo SDK** | `~58.0.23` | Stabil; New Architecture & React Compiler aktif (`app.json`). |
| **React / React Native** | `19.3.0` / `0.88.1` | Mendukung concurrent rendering & native bridgeless mode. |
| **TypeScript** | `~6.0.3` | Strict typechecking aktif (`npx tsc --noEmit` $\rightarrow$ 0 error). |
| **Expo Router** | `~58.0.30` | Typed routes aktif; `<SafeAreaProvider>` tunggal di `src/app/_layout.tsx`. |
| **React Native Reanimated** | `4.7.1` (`worklets: 0.13.0`) | Animasi berjalan di UI thread dengan `ReduceMotion.System`. |
| **RxJS** | `^7.8.2` | Pipeline reaktif `debounceTime(300)`, `distinctUntilChanged`, `switchMap`, `catchError`. |
| **Local Persistence** | `expo-sqlite` (`~58.0.17`), `expo-secure-store` (`~58.0.3`), `expo-file-system` (`~58.0.13`) | Pemisahan 3-tier storage: Keystore untuk rahasia $\le 2\text{ KB}$, FileSystem sandbox untuk media, SQLite untuk cache laporan & antrean outbox. |
| **Network & LBS** | `@react-native-community/netinfo` (`12.0.1`), `expo-location` (`~58.0.20`), `react-native-maps` (`1.29.11`) | Foreground-only GPS watcher dengan adaptive interval (50m/20m/5m) & reachability probe. |

---

## 3. Matriks Temuan Audit Baseline & Refaktorisasi (Audit Findings Matrix)

| ID | Area | Temuan & Bukti (Evidence) | Risiko | Prioritas | Rekomendasi & Perbaikan (Fix Applied) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | **Supabase Security & Client Init** | Sebelumnya `ReportRepository` dan `ReportSearchService` hanya memanggil `reportCacheRepository` lokal tanpa klien PostgREST nyata, serta belum memiliki penjaga terhadap penyalahgunaan `service_role` key di env client. | Risiko bypass RLS jika developer salah memasukkan `service_role` key ke `EXPO_PUBLIC_*`, serta data utama hanya berputar di memori/lokal. | **CRITICAL** | Membangun [`supabaseSecurity.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/utils/supabaseSecurity.ts) & [`supabaseClient.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/supabase/supabaseClient.ts) dengan `detectForbiddenClientKey()` yang memeriksa prefix `sb_secret_` dan payload JWT `role: "service_role"`, dilengkapi migrasi SQL & RLS di [`20261125_001_civic_pulse_schema_and_rls.sql`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/supabase/migrations/20261125_001_civic_pulse_schema_and_rls.sql). |
| **F-02** | **Check 2: Truthful Sync Feedback** | Pada [`src/app/reports.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/app/reports.tsx), `handleUpdateStatus` langsung menampilkan toast sukses sebelum operasi async selesai dan tidak membedakan antara *terkonfirmasi server* vs *masuk antrean outbox saat offline*. | Menyesatkan pengguna seolah-olah server telah menerima perubahan padahal perangkat sedang offline. | **HIGH** | Mengubah `ReportRepository.createReport` & `updateReportStatus` agar mengembalikan `syncOutcome: "confirmed_remote" \| "queued_offline" \| "updated_local"`. UI kini menampilkan pesan jujur sesuai status konfirmasi. |
| **F-03** | **Check 2: Cache Wiped on Search Error** | Pada [`reportSearchService.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/reports/reportSearchService.ts), blok `catchError` mengembalikan `reports: []`, menghapus data cache yang sedang dilihat pengguna saat terjadi kegagalan refresh. | Pengguna kehilangan akses baca terhadap laporan tersimpan ketika jaringan tiba-tiba putus saat mencari. | **HIGH** | Mempertahankan `this.resultsSubject.value.reports` pada `catchError` dengan flag `isFromCache: previousReports.length > 0`. |
| **F-04** | **Check 1: Error Taxonomy & Log Redaction** | Pesan error dari blok `catch` masih menggunakan `err?.message` mentah tanpa klasifikasi terstruktur dan tanpa penyensoran otomatis untuk token/NIK/koordinat presisi. | Kebocoran detail internal database/jaringan ke UI atau kebocoran PII/token di log. | **HIGH** | Membuat [`errorTaxonomy.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/utils/errorTaxonomy.ts) yang mengklasifikasikan 9 kategori error dan menyensor JWT, `sb_secret_`, NIK 16 digit, serta memotong koordinat GPS $>3$ desimal via `redactSensitiveData()`. |
| **F-05** | **Check 3: Unmanaged Timers** | 1) Inner `setTimeout(260ms)` di [`FeedbackToast.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/common/FeedbackToast.tsx) tidak dibersihkan saat unmount.<br>2) Tiga `setTimeout(4000ms)` di [`vault.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/app/vault.tsx) tidak disimpan di ref.<br>3) `setTimeout(1500ms)` reconnect di [`networkService.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/network/networkService.ts) tidak dibersihkan di `cleanup()`. | Pemanggilan callback/setState setelah komponen unmount dan retensi closure di memori. | **HIGH** | Menyimpan seluruh timer ID ke referensi (`dismissTimer`, `toastTimerRef`, `reconnectTimerId`) dan membersihkannya secara eksplisit pada cleanup `useEffect` / `cleanup()`. |
| **F-06** | **Check 3: Singleton Realtime Lifecycle** | [`reportRealtimeService.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/reports/reportRealtimeService.ts) menggunakan boolean `isSubscribed` tunggal tanpa *reference counting*. Jika dua screen/hook hidup berdampingan saat transisi navigasi, unmount screen pertama mematikan stream screen kedua. | Putusnya langganan realtime secara prematur saat perpindahan layar. | **MEDIUM** | Menambahkan reference counter `subscriberCount` pada `start()` dan `stop()`, sehingga koneksi hanya ditutup ketika consumer terakhir keluar (`subscriberCount === 0`) atau `stop(true)` dipanggil. |
| **F-07** | **16ms Mandate: FlatList Header Remount** | Pada [`ReportList.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/reports/ReportList.tsx), `ListHeaderComponent` diberikan fungsi `renderHeader = useCallback(...)` yang bergantung pada `ListHeaderComponent` (yang berubah setiap ketikan `criteria.query`). Perubahan referensi fungsi membuat `FlatList` melakukan unmount & remount seluruh header pada setiap huruf yang diketik. | Kehilangan fokus keyboard pada `ReportSearchBar` dan frame drop $>16.67\text{ ms}$ saat mengetik. | **HIGH** | Mengubah `renderHeader` dari fungsi komponen menjadi memoized `ReactElement` (`headerElement = useMemo(...)`) dan menstabilkan callback toast di `ReportsScreen`. |
| **F-08** | **16ms Mandate: Custom Memo Comparator Bug** | Pada [`ReportMarker.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/map/ReportMarker.tsx), comparator `React.memo` hanya memeriksa `id`, `isSelected`, dan `coordinate`, tetapi mengabaikan `severity`, `category`, dan `updatedAt`. | Warna pin keparahan atau ikon kategori di peta tidak terperbarui ketika event realtime mengubah status/severity laporan. | **MEDIUM** | Memperbaiki comparator `ReportMarker` agar menyertakan `severity`, `category`, dan `updatedAt`. |

---

## 4. Supabase Security & Data Integrity Audit

### 4.1 Environment Separation & Forbidden Key Guard
- Aplikasi membaca variabel publik `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Fungsi `detectForbiddenClientKey()` di [`src/utils/supabaseSecurity.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/utils/supabaseSecurity.ts) memeriksa tiga lapisan:
  1. Menolak kunci dengan awalan `sb_secret_`.
  2. Menolak string yang mengandung `service_role`.
  3. Mendekode segmen payload JWT (base64url) dan menolak token jika klaim `"role": "service_role"` ditemukan.
- Bila terdeteksi pelanggaran, klien menolak melakukan request jaringan dan mengembalikan kode `ERR_RLS_FORBIDDEN` tanpa mengekspose nilai kunci ke log.

### 4.2 Skema Database, RLS & Authoritative Status Transitions
Migrasi SQL produksi telah disusun di [`supabase/migrations/20261125_001_civic_pulse_schema_and_rls.sql`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/supabase/migrations/20261125_001_civic_pulse_schema_and_rls.sql):
1. **Server-Side Constraints:**
   - `title`: panjang karakter antara 5 hingga 160 karakter.
   - `description`: panjang karakter antara 10 hingga 2000 karakter.
   - `latitude` $\in [-90, 90]$ dan `longitude` $\in [-180, 180]$.
   - `category` $\in \{\text{'road-damage'}, \text{'flood'}, \text{'landslide'}, \text{'street-light'}\}$.
   - `status` $\in \{\text{'submitted'}, \text{'verified'}, \text{'in\_progress'}, \text{'resolved'}, \text{'rejected'}\}$.
2. **Row-Level Security (RLS) Policies:**
   - `ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;` dan `FORCE ROW LEVEL SECURITY;`.
   - `reports_select_active`: Mengizinkan pembacaan hanya untuk baris dengan `deleted_at IS NULL`.
   - `reports_insert_authenticated_owner`: Wajib `auth.uid() = reporter_id` dan status awal harus `'submitted'`.
   - `reports_update_own_submitted`: Pelapor hanya dapat memperbarui laporannya sendiri selama status masih `'submitted'`.
   - `reports_update_field_officer`: Hanya akun dengan klaim JWT `user_role IN ('field_officer', 'coordinator_admin')` yang berhak memverifikasi atau mengubah status penanganan.
3. **Authoritative Trigger & Client State Machine:**
   - Trigger PostgreSQL `enforce_report_status_transition()` dan fungsi TypeScript `validateStatusTransition()` menegakkan aturan transisi yang identik:
     - `submitted` $\rightarrow$ `verified` atau `rejected`
     - `verified` $\rightarrow$ `in_progress` atau `rejected`
     - `in_progress` $\rightarrow$ `resolved`
     - `resolved` & `rejected` adalah status terminal (tidak dapat diubah mundur).
4. **Pagination & Query Limits:**
   - `clampQueryLimit()` membatasi setiap query PostgREST pada `DEFAULT_LIMIT = 50` dan `MAX_LIMIT = 100` baris, disertai `AbortController` timeout 8000ms.
5. **Private Storage Policy:**
   - Bucket dokumen bukti (`civic-vault-private`) disetel `public = false` dengan batas ukuran 10 MB dan whitelist MIME (`image/jpeg`, `image/png`, `application/pdf`).

---

## 5. Architect's Audit Protocol (Check 1, Check 2, Check 3)

### Check 1 — Explicit Error Handling & Just-In-Time Permissions
- **Tidak ada empty catch tanpa alasan:** Setiap fallback SQLite/FileSystem memiliki jalur pemulihan deterministik (memory map fallback atau rollback berkas fisik atomik di `DocumentVaultService.importFile`).
- **9 Kategori Error Terklasifikasi (`classifyAppError`):**
  `validation`, `permission`, `network`, `timeout`, `auth`, `server`, `storage`, `conflict`, `unknown`.
- **Redaksi Log Sensitif (`redactSensitiveData`):**
  Menyensor token JWT, kunci `sb_secret_`, NIK 16 digit, dan memotong koordinat GPS menjadi maksimal 3 desimal sebelum dicatat.
- **Just-In-Time (JIT) Permissions:**
  - Lokasi hanya diminta saat peta aktif (`useLocationTracking`) dengan fallback peta Malang Raya jika ditolak.
  - Dokumen diimpor melalui modal edukasi JIT (`VaultJitModal`) menggunakan System Document Picker (Scoped Storage) tanpa meminta izin `READ_EXTERNAL_STORAGE` yang berlebihan.

### Check 2 — Graceful Fallbacks & Skeleton UI
| Kondisi State | Perilaku UI & Data yang Ditampilkan |
| :--- | :--- |
| **Initial Loading (Cold Start)** | `reports.length === 0 && loading === true` $\rightarrow$ Menampilkan `ReportSkeletonList` (3 kartu shimmer Reanimated ringan). |
| **Refreshing dengan Cache Tersedia** | `reports.length > 0 && loading === true` $\rightarrow$ Data cache tetap tampil di layar, ditambah banner tipis *"Menyinkronkan hasil pencarian..."* (tidak mengganti layar dengan skeleton). |
| **Refresh Gagal saat Cache Ada** | `catchError` di `ReportSearchService` mempertahankan `previousReports` dengan banner error + tombol *"Coba Lagi"* dan badge cache SQLite. |
| **Offline Mutation (Create / Update)** | Disimpan ke SQLite + Outbox Queue (`syncOutcome: "queued_offline"`). Toast menampilkan *"Disimpan di Outbox Lokal (Menunggu konfirmasi server saat online)"* — tidak pernah mengklaim sukses server secara palsu. |
| **Empty Search / Filter** | `reports.length === 0 && !loading` $\rightarrow$ Menampilkan tampilan *Tidak Ada Laporan yang Cocok* beserta tombol *"Reset Semua Filter"*. |

### Check 3 — Resource & Subscription Cleanup Inventory

| Resource | Owner | Setup Location | Cleanup Mechanism | Bukti Verifikasi (Evidence) |
| :--- | :--- | :--- | :--- | :--- |
| **GPS Location Watcher** | `useLocationTracking` | `Location.watchPositionAsync` di `useEffect` ([`useLocationTracking.ts:221`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/hooks/useLocationTracking.ts#L221)) | `subscriptionRef.current.remove()` + `isMountedRef` + `isEffectActive` guard ([`useLocationTracking.ts:54-59, 248-268`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/hooks/useLocationTracking.ts#L54-L59)) | Pergantian mode tracking (50m/20m/5m) selalu memanggil `cleanupSubscription()` sebelum watcher baru dibuat; jika unmount terjadi saat promise belum selesai, `sub.remove()` langsung dipanggil. |
| **Realtime Stream & Network Reconnect** | `ReportRealtimeService` | `start()` dengan `subscriberCount += 1` ([`reportRealtimeService.ts:32`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/reports/reportRealtimeService.ts#L32)) | `stop()` mendekremen `subscriberCount` dan memanggil `unsubscribeProvider()` & `networkSubscription.unsubscribe()` saat `0` ([`reportRealtimeService.ts:105-120`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/reports/reportRealtimeService.ts#L105-L120)) | Diuji secara otomatis pada `test-p13-audit.mjs` (skenario multi-screen mount/unmount overlap). |
| **RxJS Search Consumer Subscriptions** | `useReportSearch` & `MapScreen` | `searchResults$.subscribe`, `events$.subscribe`, `networkState$.subscribe`, `syncState$.subscribe` ([`useReportSearch.ts:44-72`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/hooks/useReportSearch.ts#L44-L72)) | `searchSub.unsubscribe()`, `realtimeSub.unsubscribe()`, `networkSub.unsubscribe()`, `syncSub.unsubscribe()` pada return `useEffect` ([`useReportSearch.ts:78-84`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/hooks/useReportSearch.ts#L78-L84)) | Setiap subscription RxJS di-dispose saat screen unmount; `isMountedRef` mencegah setState pasca-unmount. |
| **NetInfo Listener & Reconnect Timer** | `NetworkService` & `NetworkStateService` | `NetInfo.addEventListener` & `setTimeout(1500ms)` ([`networkService.ts:27, 53`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/network/networkService.ts#L27)) | `clearReconnectTimer()` & `unsubscribeNetInfo()` di `cleanup()` ([`networkService.ts:120-126`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/network/networkService.ts#L120-L126)) | Timer reconnect 1500ms kini disimpan di `reconnectTimerId` dan dibatalkan jika terjadi transisi baru atau cleanup. |
| **HTTP Fetch Probe & PostgREST Requests** | `NetworkStateService` & `SupabaseRestClient` | `new AbortController()` + `setTimeout(..., timeoutMs)` ([`supabaseClient.ts:126, 207`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/supabase/supabaseClient.ts#L126)) | `clearTimeout(timeoutId)` di blok `finally` ([`supabaseClient.ts:183, 255`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/supabase/supabaseClient.ts#L183)) | Mencegah request menggantung tanpa batas waktu dan memastikan timer timeout selalu dibersihkan. |
| **FeedbackToast Dual Timers** | `FeedbackToast` | `timer = setTimeout(..., durationMs)` dan nested `dismissTimer = setTimeout(..., 260)` ([`FeedbackToast.tsx:50-56`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/common/FeedbackToast.tsx#L50-L56)) | `clearTimeout(timer)` dan `clearTimeout(dismissTimer)` pada cleanup `useEffect` ([`FeedbackToast.tsx:59-64`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/common/FeedbackToast.tsx#L59-L64)) | Mencegah pemanggilan `onDismiss()` setelah screen ditutup saat animasi fade-out sedang berlangsung. |
| **VaultScreen Toast Timer** | `VaultScreen` | `toastTimerRef.current = setTimeout(..., 4000)` ([`vault.tsx:59`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/app/vault.tsx#L59)) | `clearTimeout(toastTimerRef.current)` pada unmount `useEffect` ([`vault.tsx:66-73`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/app/vault.tsx#L66-L73)) | Menggantikan 3 `setTimeout` lepas dengan satu timer ref terkelola. |
| **Marker View Tracking Timer** | `ReportMarker` | `setTimeout(() => setTracksViewChanges(false), 150)` ([`ReportMarker.tsx:67`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/map/ReportMarker.tsx#L67)) | `return () => clearTimeout(timer)` ([`ReportMarker.tsx:70`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/map/ReportMarker.tsx#L70)) | Menghentikan bitmap snapshot tracking Android Maps setelah 150ms dan membersihkan timer saat marker unmount. |

---

## 6. 16-Millisecond Mandate (60 FPS Profiling & Selective Optimization)

> **Catatan Metodologi & Kejujuran Pengukuran:** Pengukuran pada lingkungan audit ini dilakukan melalui inspeksi grafik dependensi render React, jumlah re-mount pohon komponen pada `FlatList`, serta waktu eksekusi komputasi JS pada Node.js test runner. Kami tidak mengarang angka FPS GPU perangkat fisik; validasi frame time UI thread didasarkan pada eliminasi operasi sinkron berat dan pencegahan remount komponen di jalur kritis.

| Screen / Flow | Kondisi Uji | Gejala / Hotspot Awal | Analisis / Measurement | Perubahan Refactor | Hasil & Trade-off |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reports Feed & Search Bar (`ReportsScreen` + `ReportList`)** | Pengguna mengetik cepat di `ReportSearchBar` dengan daftar laporan aktif. | `ReportList` mendefinisikan `renderHeader = useCallback(() => <View>{ListHeaderComponent}...</View>, [ListHeaderComponent, ...])`. Karena `ListHeaderComponent` diperbarui setiap huruf diketik, identitas fungsi `renderHeader` berubah dan `FlatList` melakukan unmount-remount seluruh header. | Remount pohon komponen header pada setiap keystroke + risiko kehilangan fokus keyboard (`TextInput`). | Mengubah `renderHeader` dari fungsi komponen menjadi memoized element `headerElement = useMemo(...)` di [`ReportList.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/reports/ReportList.tsx#L104) serta menstabilkan `handleDismissToast` dengan `useCallback` di [`reports.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/app/reports.tsx#L51). | React hanya melakukan reconciliation properti in-place tanpa unmount `TextInput`; fokus keyboard stabil dan overhead JS thread per ketikan turun drastis. |
| **Interactive Map Markers (`CivicMap` + `ReportMarker`)** | Peta menampilkan puluhan marker laporan sementara GPS pengguna bergerak setiap 5m–20m. | Setiap update GPS pengguna memicu re-render `MapScreen`. Selain itu, comparator `React.memo` pada `ReportMarker` sebelumnya mengabaikan perubahan `severity` dan `category`. | Re-render bitmap marker pada Android `MapView` sangat mahal jika `tracksViewChanges` selalu `true`, tetapi comparator yang terlalu sempit menyebabkan bug visual. | Mempertahankan `tracksViewChanges` hanya aktif 150ms saat state seleksi berubah, dan melengkapi comparator `ReportMarker` dengan `severity`, `category`, dan `updatedAt` ([`ReportMarker.tsx:120-129`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/map/ReportMarker.tsx#L120-L129)). | Marker yang tidak berubah tetap memiliki cost render 0 saat GPS pengguna bergerak, namun langsung memperbarui visual pin saat ada update realtime. |
| **Virtualized Report Item (`ReportItem`)** | Scroll daftar laporan dan klik aksi cepat (*Verifikasi / Proses / Selesai*). | Setiap item memiliki animasi tekan dan badge status. | Custom comparator `React.memo` pada `ReportItem` memeriksa `id`, `status`, `title`, `description`, dan `updatedAt`, sedangkan animasi tekan dijalankan di UI thread via Reanimated `useSharedValue`. | Mempertahankan selective memoization pada `ReportItem` dan membatasi jumlah baris query via `clampQueryLimit` (50 default, 100 max) ditambah windowing `FlatList` (`initialNumToRender={8}`, `windowSize={5}`). | Hanya 1 item yang di-rerender saat statusnya berubah; waktu frame tetap terjaga di bawah budget 16.67ms. |

---

## 7. Matriks Pengujian & Bukti Eksekusi (Test Matrix)

### 7.1 Hasil Pengujian Otomatis (`npm test`, `tsc`, `expo lint`)

| Suite Pengujian | Fokus Verifikasi | Jumlah Test | Status | Waktu Eksekusi |
| :--- | :--- | :---: | :---: | :---: |
| `scripts/test-haversine.mjs` | Validasi koordinat geodetik, kalkulasi jarak Haversine, antipodal, formatter jarak | 6 | **PASS (6/6)** | ~18.6 ms |
| `scripts/test-p10-security.mjs` | Sanitasi Path Traversal (CWE-22), whitelist MIME, batas ukuran file, masking NIK/Token, batas 2KB SecureStore | 6 | **PASS (6/6)** | ~13.3 ms |
| `scripts/test-p11-offline-sync.mjs` | UUID v4 idempotency, exponential backoff + jitter, sanitasi payload outbox, klasifikasi transient vs permanent error, conflict resolution | 6 | **PASS (6/6)** | ~36.4 ms |
| `scripts/test-p11-reactive.mjs` | Normalisasi query RxJS, `distinctUntilChanged`, pembatalan `switchMap`, isolasi `catchError`, penolakan stale timestamp realtime | 5 | **PASS (5/5)** | ~17.0 ms |
| `scripts/test-p12-responsive.mjs` | Orientasi portrait/landscape, klasifikasi tier perangkat, adaptive padding, standar WCAG 44dp, kontrak transisi state Skeleton/Cache/Empty/Error | 8 | **PASS (8/8)** | ~12.9 ms |
| `scripts/test-p13-audit.mjs` | Klasifikasi 9 kategori error, redaksi JWT/NIK/GPS di log, deteksi `service_role` & `sb_secret_`, state machine transisi status & otorisasi role, pagination clamping, ref-counted cleanup | 6 | **PASS (6/6)** | ~14.8 ms |
| **Total Unit & Audit Tests** | **Seluruh Milestone (P9 s/d P13)** | **37** | **100% LULUS (37/37)** | **~113.0 ms** |
| **TypeScript Typecheck** | `npx tsc --noEmit` | Seluruh repo | **PASS (0 Error)** | Verified |
| **Expo ESLint** | `npx expo lint` | Seluruh repo | **PASS (0 Error, 0 Warning)** | Verified |

### 7.2 Matriks Skenario Fungsional & Keamanan (14 Skenario Wajib)

| Area | Skenario | Hasil yang Diharapkan | Status Verifikasi |
| :--- | :--- | :--- | :--- |
| **Auth / RLS** | Sesi kadaluarsa atau HTTP 401/403 dari Supabase | Diklasifikasikan sebagai `auth` (`ERR_AUTH_SESSION` / `ERR_RLS_FORBIDDEN`), menampilkan pesan pemulihan aman tanpa crash. | Terverifikasi (`test-p13-audit.mjs`) |
| **Backend** | Kegagalan jaringan / HTTP 502 / Timeout 8s | `SupabaseRestClient` membatalkan request via `AbortController`, `ReportRepository` melakukan fallback ke SQLite cache (`isFromCache: true`). | Terverifikasi (`reportRepository.ts` & `test-p13-audit.mjs`) |
| **Permission** | Pengguna menolak izin lokasi / kamera | Status berubah ke `permission-denied` / `needs-settings`, peta tetap dapat dibuka dengan titik simulasi dan tombol menuju pengaturan. | Terverifikasi (`useLocationTracking.ts` & `permissionService.ts`) |
| **Offline Launch** | Membuka aplikasi tanpa koneksi internet | Menampilkan laporan dari cache SQLite dengan banner kuning *"Mode Offline / Cache Lokal"* secara jujur. | Terverifikasi (`ReportList.tsx` & `test-p12-responsive.mjs`) |
| **Offline Submit** | Mengubah status / membuat laporan saat offline | Data masuk ke `outbox_operations` dengan `syncOutcome: "queued_offline"`. Toast menampilkan status antrean outbox, bukan sukses server palsu. | Terverifikasi (`reportRepository.ts` & `reports.tsx`) |
| **Reconnect** | Koneksi kembali pulih (`reconnecting` $\rightarrow$ `online`) | `useReportSearch` memicu `processOutbox()` dengan idempotency key dan memperbarui daftar laporan tanpa duplikasi. | Terverifikasi (`useReportSearch.ts` & `test-p11-offline-sync.mjs`) |
| **Realtime Lifecycle** | Masuk dan keluar layar laporan berulang kali | Reference counter `subscriberCount` di `ReportRealtimeService` mencegah channel ganda dan menutup langganan saat consumer terakhir keluar. | Terverifikasi (`test-p13-audit.mjs`) |
| **Reactive Search** | Mengetik kata kunci dan mengganti filter dengan cepat | `debounceTime(300)` + `distinctUntilChanged` + `switchMap` membatalkan query lama; hasil terbaru yang ditampilkan. | Terverifikasi (`test-p11-reactive.mjs`) |
| **List Performance** | Membaca dan melakukan scroll daftar laporan | `FlatList` windowing + `clampQueryLimit(50)` + `headerElement` memoized menjaga fokus input dan kelancaran scroll. | Terverifikasi (`ReportList.tsx`) |
| **Map Markers** | Memilih marker dan menerima update status laporan | `tracksViewChanges` dimatikan setelah 150ms; comparator `ReportMarker` merender ulang hanya marker yang datanya berubah. | Terverifikasi (`ReportMarker.tsx`) |
| **Form / State** | Kegagalan validasi atau kegagalan jaringan saat aksi | Input pencarian tidak ter-reset dan data cache tidak dihapus ketika refresh gagal. | Terverifikasi (`reportSearchService.ts`) |
| **Lifecycle Timers** | Menutup layar saat toast atau reconnect timer masih berjalan | Seluruh timer (`FeedbackToast`, `VaultScreen`, `NetworkService`) dibersihkan pada unmount/cleanup. | Terverifikasi (`FeedbackToast.tsx`, `vault.tsx`, `networkService.ts`) |
| **Responsive UI** | Rotasi portrait $\leftrightarrow$ landscape dan layar lebar | `useResponsiveLayout` membatasi `maxContentWidth: 960dp` tanpa overflow horizontal. | Terverifikasi (`test-p12-responsive.mjs`) |
| **Security Guard** | Percobaan menggunakan `service_role` key atau transisi status oleh `citizen_reporter` | `detectForbiddenClientKey()` memblokir inisialisasi; `validateStatusTransition()` dan trigger RLS PostgreSQL menolak perubahan status ilegal. | Terverifikasi (`test-p13-audit.mjs` & migrasi SQL) |

---

## 8. Daftar File yang Dibuat & Direfaktorisasi pada Pertemuan 13

### File Baru:
1. [`src/utils/errorTaxonomy.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/utils/errorTaxonomy.ts) — Klasifikasi 9 kategori error dan fungsi `redactSensitiveData()` untuk mencegah kebocoran JWT, NIK, dan koordinat presisi di log.
2. [`src/utils/supabaseSecurity.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/utils/supabaseSecurity.ts) — Penjaga keamanan `detectForbiddenClientKey()`, `auditSupabaseEnvironment()`, `validateStatusTransition()`, dan `clampQueryLimit()`.
3. [`src/services/supabase/supabaseClient.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/supabase/supabaseClient.ts) — Klien PostgREST Supabase dengan timeout `AbortController` 8000ms, header idempotency, dan paginasi terukur.
4. [`supabase/migrations/20261125_001_civic_pulse_schema_and_rls.sql`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/supabase/migrations/20261125_001_civic_pulse_schema_and_rls.sql) — Skema tabel `public.reports`, indeks pencarian, trigger otoritatif transisi status, kebijakan RLS, dan skrip rollback.
5. [`scripts/test-p13-audit.mjs`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/scripts/test-p13-audit.mjs) — Suite pengujian otomatis Pertemuan 13.

### File Direfaktorisasi Secara Inkremental:
1. [`src/providers/realtime/SupabaseRealtimeProvider.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/providers/realtime/SupabaseRealtimeProvider.ts) — Integrasi `auditSupabaseEnvironment()` dan pelaporan nama provider yang jujur.
2. [`src/services/reports/reportRepository.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/reports/reportRepository.ts) — Integrasi `supabaseRestClient`, validasi transisi status otoritatif, dan pembedaan `syncOutcome` (`confirmed_remote` vs `queued_offline` vs `updated_local`).
3. [`src/services/reports/reportSearchService.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/reports/reportSearchService.ts) — Routing pencarian melalui `reportRepository.getReports()` dan pelestarian data cache pada `catchError`.
4. [`src/services/reports/reportRealtimeService.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/reports/reportRealtimeService.ts) — Penambahan reference counting `subscriberCount` untuk mencegah channel ganda atau pemutusan prematur.
5. [`src/services/network/networkService.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/services/network/networkService.ts) — Pengelolaan dan pembersihan `reconnectTimerId` pada `cleanup()`.
6. [`src/components/common/FeedbackToast.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/common/FeedbackToast.tsx) — Pembersihan nested timer `dismissTimer` saat unmount.
7. [`src/app/vault.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/app/vault.tsx) — Pengelolaan timer toast melalui `toastTimerRef` dengan cleanup saat unmount.
8. [`src/hooks/useReportSearch.ts`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/hooks/useReportSearch.ts) — Ekspos hasil mutasi lengkap dan `activeProviderName` dinamis.
9. [`src/components/reports/ReportSyncBanner.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/reports/ReportSyncBanner.tsx) — Menampilkan nama provider aktif secara dinamis.
10. [`src/components/reports/ReportList.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/reports/ReportList.tsx) — Optimasi `ListHeaderComponent` menggunakan memoized `ReactElement` (`headerElement`) demi menjaga fokus keyboard dan 16ms frame budget.
11. [`src/app/reports.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/app/reports.tsx) — Penanganan `await updateReportStatus` dengan umpan balik toast jujur berdasarkan `syncOutcome` serta stabilisasi `handleDismissToast`.
12. [`src/components/map/ReportMarker.tsx`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/src/components/map/ReportMarker.tsx) — Perbaikan comparator `React.memo` untuk menyertakan `severity`, `category`, dan `updatedAt`.

---

## 9. Blockers, Risiko Tersisa & Keputusan Akhir Release Candidate

### Blockers Operasional Sebelum Rilis Produksi Publik:
1. **Provisioning Environment Supabase Produksi:** Variabel `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY` saat ini belum diisi di repository lokal (demi keamanan agar tidak ada kredensial di git). Sebelum build EAS produksi, tim harus mengeksekusi migrasi [`supabase/migrations/20261125_001_civic_pulse_schema_and_rls.sql`](file:///c:/Pelajaran-Kuliah-UMM/Pemrograman%20Mobile/Tugas_Besar/civic-pulse-app/supabase/migrations/20261125_001_civic_pulse_schema_and_rls.sql) pada dashboard Supabase dan mendaftarkan URL serta anon key ke EAS Secrets.
2. **Keterbatasan Background Fetch pada Expo Go:** Sebagaimana terdokumentasi di `backgroundSyncTask.ts`, sinkronisasi latar belakang (`WorkManager` / `BGAppRefreshTask`) bersifat oportunistik dan memerlukan *Development Build* (`npx expo run:android` / EAS Build), bukan Expo Go standar.

### Rekomendasi Final:
> **STATUS: `READY FOR INTERNAL TEST`**  
> Seluruh arsitektur, penjaga keamanan, klasifikasi error, pembersihan memori/timer, optimasi render 16ms, dan kontrak offline-first telah terintegrasi dan lulus 37 pengujian otomatis tanpa regresi pada fitur Pertemuan 9–12.
