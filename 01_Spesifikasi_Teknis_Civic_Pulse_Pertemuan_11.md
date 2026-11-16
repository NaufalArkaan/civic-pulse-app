# Civic Pulse — Spesifikasi Teknis Pertemuan 11
## Milestone 3: Real-Time Data Pipeline & Background Task Processing

**Mata Kuliah:** Pemrograman Mobile  
**Tema:** Civic Pulse & Community Disaster Management (SDG 11)  
**Milestone:** Pertemuan 11  
**Sub-CPMK 9:** Mahasiswa mampu mengelola alur data reaktif tingkat lanjut menggunakan RxJS dan penanganan event background.  
**Status:** Technical Specification — Implementation Baseline

---

## 1. Ringkasan

Civic Pulse adalah aplikasi mobile untuk pelaporan kerusakan infrastruktur kota dan mitigasi bencana berbasis komunitas. Pertemuan 9 membangun fondasi LBS dan interactive mapping. Pertemuan 10 membangun SecureStore, Document Vault lokal, dan Just-In-Time Runtime Permissions.

Pertemuan 11 membawa aplikasi ke tahap data reaktif dan sinkronisasi:
1. RxJS pipeline untuk pencarian/filter laporan menggunakan `debounceTime`, `distinctUntilChanged`, dan `switchMap`.
2. Pembaruan data laporan secara real-time melalui Supabase Realtime.
3. Offline fallback menggunakan cache lokal dan antrean operasi tertunda.
4. Background task untuk sinkronisasi tertunda yang dapat dijalankan oleh sistem operasi, bukan untuk menjaga WebSocket tetap hidup.

**Keputusan arsitektur yang direkomendasikan:** Supabase PostgreSQL + Supabase Realtime sebagai backend/realtime provider, RxJS sebagai reactive pipeline, `@react-native-community/netinfo` untuk status jaringan, dan `expo-sqlite` sebagai cache/outbox lokal terstruktur. Gunakan `expo-background-task` dan `expo-task-manager` hanya untuk pekerjaan sinkronisasi yang boleh ditunda oleh OS.

Jika repository sudah memiliki backend/provider yang berjalan, audit terlebih dahulu dan pertahankan pilihan yang telah digunakan. Jangan mengganti backend secara sepihak. Jika Supabase belum dikonfigurasi, implementasikan provider abstraction dan integrasikan Supabase hanya setelah project URL dan publishable/anon key yang sah tersedia. Jangan membuat kredensial palsu.

## 2. Konteks dan Deliverables

### 2.1 Deliverables Pertemuan 11
1. Pembuatan RxJS Pipeline (`debounceTime`, `distinctUntilChanged`, `switchMap`) pada fitur pencarian/filter.
2. Integrasi pembaruan data real-time (WebSocket / Firebase Realtime / Supabase Event).
3. Penanganan kondisi koneksi terputus (*Graceful Offline Fallbacks*).

### 2.2 Interpretasi implementasi
- Search/filter: perubahan input pengguna diproses secara reaktif dan tidak memicu request untuk setiap karakter.
- Realtime: aplikasi aktif menerima event laporan baru/perubahan status tanpa refresh manual.
- Offline: pengguna tetap dapat melihat data cache; operasi tulis yang didukung disimpan sebagai pending operation dan dikirim kembali saat jaringan tersedia.
- Background: sistem operasi dapat menjadwalkan pekerjaan sinkronisasi tertunda. Eksekusinya tidak dijamin tepat waktu.

## 3. Tujuan Sistem

1. Menyediakan pencarian laporan yang responsif dan mengurangi request berlebihan.
2. Membatalkan/menyingkirkan hasil pencarian lama ketika query baru masuk.
3. Memperbarui daftar dan marker laporan saat ada event realtime yang sah.
4. Mencegah duplikasi event atau update data yang tidak konsisten.
5. Menampilkan data lokal saat offline.
6. Menyimpan operasi tulis yang didukung ke outbox lokal dan melakukan retry secara aman.
7. Menampilkan status koneksi dan status sinkronisasi secara transparan.
8. Memproses pekerjaan sinkronisasi tertunda melalui mekanisme background yang sesuai platform.
9. Menjaga fitur Pertemuan 9 dan 10 tetap berfungsi.

## 4. Keputusan Arsitektur

| Area | Teknologi utama | Tanggung jawab |
|---|---|---|
| Reactive search/filter | `rxjs` | Debounce, distinct, switchMap, subscription lifecycle |
| Realtime backend | Supabase Realtime | Event INSERT/UPDATE/DELETE laporan |
| Backend/database | Supabase PostgreSQL | Source of truth laporan |
| Network state | `@react-native-community/netinfo` | Online/offline/reconnect |
| Local structured cache | `expo-sqlite` | Cache laporan dan outbox |
| Background execution | `expo-background-task` + `expo-task-manager` | Deferred sync yang dijadwalkan OS |
| Existing local files/secrets | SecureStore/FileSystem P10 | Pertahankan tanggung jawab P10 |

**Catatan pemilihan provider:** Supabase Realtime dipilih sebagai baseline karena cocok untuk event perubahan baris laporan pada tahap implementasi ini. Bungkus akses provider dalam `RealtimeProvider`/service agar tidak tersebar di screen. Untuk skala lebih besar, pertimbangkan Supabase Broadcast sesuai dokumentasi dan kebutuhan keamanan/skalabilitas. Jangan subscribe ke seluruh database tanpa filter.

## 5. Batasan Penting Background dan Realtime

- WebSocket/realtime subscription ditujukan untuk aplikasi foreground/aktif.
- Jangan menjanjikan WebSocket selalu hidup ketika aplikasi masuk background atau dihentikan OS.
- `expo-background-task` adalah mekanisme pekerjaan tertunda; OS menentukan waktu eksekusi berdasarkan kebijakan baterai, jaringan, dan penggunaan perangkat.
- Pada Android, WorkManager memiliki minimum interval 15 menit; pada iOS waktu eksekusi ditentukan sistem dan dapat jauh lebih lambat.
- Background task bukan pengganti push notification untuk peringatan darurat yang harus segera sampai.
- Untuk kebutuhan peringatan bencana kritis di masa depan, desain push notification terpisah dan uji delivery/permission.
- Pengujian background task harus menggunakan development build/perangkat fisik sesuai batasan platform; jangan menganggap Expo Go merepresentasikan semua perilaku native.

## 6. Use Cases Pengguna

### UC-01 — Mencari laporan
Pengguna membuka daftar laporan, mengetik kata kunci atau memilih filter kategori/status. Hasil diperbarui setelah jeda singkat dan hanya hasil query terbaru yang diterapkan.

### UC-02 — Menerima laporan baru
Pengguna membuka peta/daftar laporan. Saat pengguna lain membuat laporan baru, event diterima dan cache/UI diperbarui tanpa refresh manual.

### UC-03 — Perubahan status laporan
Petugas atau pihak berwenang memperbarui status laporan, misalnya `submitted` menjadi `verified` atau `in_progress`. Perubahan yang diizinkan diterima subscriber dan ditampilkan.

### UC-04 — Kehilangan koneksi
Saat jaringan terputus, aplikasi menunjukkan status offline, tetap menampilkan cache, menonaktifkan/menandai fitur yang membutuhkan server, dan menyimpan operasi tulis yang memang diizinkan ke outbox.

### UC-05 — Reconnect
Saat jaringan pulih, aplikasi memvalidasi koneksi, melakukan refresh data dari server, mengirim pending operations dengan idempotency key, lalu melanjutkan subscription realtime.

## 7. RxJS Search/Filter Pipeline

### 7.1 Input
Search/filter dapat mencakup:
- `query`: teks pencarian nama/judul/deskripsi laporan;
- `category`: kategori laporan, misalnya `infrastructure`, `flood`, `landslide`, `fire`, sesuai enum domain final;
- `status`: status laporan;
- optional bounding area/map viewport jika sudah didukung API.

Jangan memasukkan semua filter jika backend belum mendukungnya. Tentukan satu `SearchCriteria` type sebagai kontrak.

### 7.2 Pipeline wajib
Gunakan urutan konseptual:

```ts
criteria$
  .pipe(
    debounceTime(300),
    distinctUntilChanged((previous, current) =>
      areSearchCriteriaEqual(previous, current)
    ),
    switchMap((criteria) => searchReports(criteria))
  )
```

Implementasi final harus:
- Menormalisasi query (trim dan normalisasi whitespace) sebelum equality check.
- Membandingkan seluruh kriteria relevan, bukan hanya string query.
- Menangani loading, empty, success, dan error.
- Mengubah error request menjadi state yang dapat dipulihkan agar stream tidak mati permanen.
- Menghindari race condition: hasil query lama tidak boleh menimpa hasil query terbaru.
- Melakukan unsubscribe saat hook/screen tidak lagi digunakan.
- Tidak melakukan subscribe berkali-kali akibat render.
- Menyediakan fallback pencarian lokal dari cache saat offline.
- Memisahkan pencarian remote dan local fallback agar tidak ada hasil ganda.

`switchMap` membuang subscription inner sebelumnya ketika kriteria baru diterima. Jika API client tidak mendukung AbortSignal, pastikan hasil lama tetap tidak dapat menimpa state terbaru.

### 7.3 Perilaku UX
- Debounce awal yang disarankan: 300 ms, dapat disesuaikan berdasarkan pengujian.
- Tampilkan indikator loading hanya ketika pencarian berjalan.
- Tampilkan empty state bila tidak ada hasil.
- Saat offline, beri label “Hasil dari data tersimpan” dan jangan mengklaim data terbaru.
- Tampilkan tombol retry ketika request gagal.
- Hindari request untuk query identik yang berulang.

## 8. Real-Time Data Architecture

### 8.1 Event yang didukung
Minimal:
- `INSERT`: laporan baru dibuat.
- `UPDATE`: perubahan status, deskripsi yang diizinkan, atau koordinat yang sah.
- `DELETE`: penghapusan sesuai kebijakan aplikasi; pertimbangkan soft delete untuk audit.

Event harus berasal dari tabel laporan yang ditentukan, bukan subscribe global ke semua tabel.

### 8.2 Flow
1. App memuat snapshot laporan dari local cache.
2. Ketika online, app melakukan fetch awal dari backend dan memperbarui cache.
3. App membuat subscription realtime untuk event laporan yang relevan.
4. Event diterima dan divalidasi.
5. Cache diperbarui secara idempotent berdasarkan primary key dan timestamp/version.
6. UI/list/map membaca state terbaru dari repository/cache.
7. Saat app tidak aktif atau subscription terputus, jangan menganggap semua event tetap diterima.
8. Ketika kembali aktif/reconnect, lakukan reconciliation fetch untuk mengambil perubahan yang terlewat.

### 8.3 Idempotency dan Ordering
- Gunakan `report.id` sebagai identitas utama.
- Simpan `updated_at` atau versi server untuk mendeteksi update lebih baru.
- Event yang sama dapat diterima lebih dari sekali; handler harus idempotent.
- Jangan menimpa data yang lebih baru dengan event yang lebih lama.
- Untuk DELETE, gunakan soft delete/tombstone bila diperlukan agar cache dapat direkonsiliasi.
- Jangan menganggap urutan event selalu cukup untuk menjamin konsistensi setelah reconnect; lakukan fetch/reconciliation.

### 8.4 Lifecycle
- Subscribe ketika screen/domain service aktif dan jaringan memungkinkan.
- Unsubscribe saat service dihentikan/unmount.
- Jangan membuat satu channel baru setiap render.
- Hindari duplicate channel/subscription.
- Tangani status `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, dan `CLOSED` sesuai API client.
- Reconnect harus memakai satu jalur terpusat dan backoff, bukan retry loop agresif.

## 9. Data Model Backend

Nama kolom disesuaikan dengan skema backend yang telah ada. Jika belum ada, gunakan rancangan konseptual berikut sebagai baseline:

### 9.1 `reports`
- `id` UUID primary key.
- `reporter_id` UUID foreign key ke identitas pengguna yang sesuai.
- `title` text.
- `description` text.
- `category` text/enum.
- `status` text/enum (`submitted`, `verified`, `in_progress`, `resolved`, `rejected`).
- `latitude` numeric/double precision.
- `longitude` numeric/double precision.
- `media_path` text nullable (hindari URL publik jika media privat).
- `created_at` timestamptz.
- `updated_at` timestamptz.
- `deleted_at` timestamptz nullable bila menggunakan soft delete.

Validasi domain: latitude -90..90, longitude -180..180; kategori/status harus dari allowlist. Jangan menyimpan NIK/token dalam tabel laporan.

### 9.2 Security dan RLS
- Aktifkan RLS pada tabel yang terekspos.
- Pengguna hanya dapat membaca data sesuai kebijakan Civic Pulse.
- Pengguna hanya dapat membuat laporan atas identitas terautentikasi yang sah.
- Perubahan status petugas dibatasi role/claim yang tervalidasi di server.
- Jangan mempercayai role yang dikirim dari client.
- Jangan memasukkan Supabase `service_role` key ke bundle mobile.
- Gunakan publishable/anon key dengan RLS.
- Jangan membuka akses UPDATE/DELETE global hanya untuk mempermudah demo.
- Buat migration/SQL policy yang dapat direview; jangan mengubah production schema tanpa persetujuan.

Jika backend belum siap, gunakan mock provider untuk UI development dan dokumentasikan bahwa real-time belum end-to-end. Jangan menyamarkan mock sebagai koneksi real.

## 10. Offline-First Cache dan Outbox

### 10.1 Local Cache
Gunakan SQLite untuk data laporan terstruktur, kecuali repository telah memiliki solusi lokal yang setara dan disetujui.

Cache minimum:
- report ID;
- field yang diperlukan untuk daftar/peta;
- status;
- koordinat;
- `updated_at`;
- `cached_at`/sync metadata bila diperlukan.

Jangan cache field sensitif yang tidak dibutuhkan. Jangan menyimpan credential di SQLite.

### 10.2 Outbox
Untuk operasi tulis yang memang didukung saat offline:
- Buat `operation_id` UUID/idempotency key.
- Simpan jenis operasi, payload minimum, created timestamp, retry count, dan status.
- Gunakan status seperti `pending`, `processing`, `synced`, `failed_permanent`.
- Hindari mengirim operasi yang sama dua kali.
- Tandai `processing` secara aman dan pulihkan jika proses mati.
- Gunakan exponential backoff dengan batas retry.
- Jangan retry kesalahan validasi/auth yang permanen tanpa perubahan.
- Tangani konflik jika server telah mengubah record.
- Jangan menyimpan token di payload outbox.
- File/media upload queue hanya jika memang menjadi bagian backend dan storage policy yang disetujui; jangan menganggap P10 Document Vault otomatis sudah memiliki upload queue.

### 10.3 Konflik
Tentukan aturan per field. Untuk baseline:
- Server menjadi source of truth untuk status resmi.
- Perubahan status hanya role berwenang yang boleh menulis.
- Draft lokal milik pelapor dapat disimpan lokal sampai berhasil dikirim.
- Jangan menerapkan last-write-wins membabi buta pada status laporan.
- Tampilkan status pending/failed agar pengguna memahami laporan belum terkirim.

## 11. Network Monitoring dan Graceful Offline Fallback

Gunakan `@react-native-community/netinfo` untuk memantau:
- network state;
- `isConnected`;
- `isInternetReachable` bila tersedia.

Perlu dibedakan:
- koneksi Wi-Fi/mobile aktif tidak selalu berarti internet dapat dijangkau;
- status NetInfo adalah indikator, bukan jaminan request backend sukses.

Perilaku:
- **Online:** fetch/realtime aktif, outbox dapat diproses.
- **Offline:** tampilkan cache, hentikan request baru yang tidak perlu, simpan operasi yang didukung ke outbox.
- **Reconnecting:** tampilkan indikator reconnect, hindari banyak retry paralel.
- **Backend unavailable:** walau internet aktif, tampilkan status server bermasalah dan tetap gunakan cache.
- **Stale cache:** tampilkan waktu pembaruan terakhir jika tersedia.

Jangan menampilkan “terkirim” sebelum server mengonfirmasi. Gunakan label “Menunggu koneksi”, “Mengirim”, “Terkirim”, atau “Gagal” sesuai status nyata.

## 12. Background Task Processing

### 12.1 Tujuan
Gunakan `expo-background-task` + `expo-task-manager` untuk pekerjaan yang boleh ditunda:
- memeriksa pending outbox;
- melakukan sinkronisasi data ringan;
- memperbarui cache ketika OS memberi kesempatan dan jaringan tersedia.

### 12.2 Batasan
- Task didefinisikan di module scope sesuai persyaratan TaskManager, bukan di dalam komponen React.
- Registrasi/unregistrasi dilakukan melalui service yang terkontrol.
- Minimum interval Android mengikuti WorkManager (umumnya 15 menit); iOS menjadwalkan sesuai kebijakan OS.
- Tidak ada jaminan task berjalan tepat pada interval yang diminta.
- Task dapat dihentikan OS dan harus aman dijalankan ulang.
- Jangan menjalankan WebSocket subscription di background task.
- Jangan menggunakan background task untuk alarm bencana real-time yang harus instan.
- Pastikan kebutuhan development build/native config dan uji pada perangkat fisik.
- Jika TaskManager/BackgroundTask tidak tersedia pada environment saat ini, dokumentasikan keterbatasan dan jangan membuat seolah sudah teruji.

### 12.3 Idempotent Worker
Worker harus:
1. Memeriksa network reachability.
2. Membaca pending operations.
3. Mengirim operasi dengan idempotency key.
4. Memperbarui status outbox sesuai hasil server.
5. Menangani error sementara vs permanen.
6. Menyimpan hasil agar aman bila task dihentikan.
7. Mengembalikan hasil Success/Failed sesuai API Expo.

## 13. Struktur Folder Konseptual

Sesuaikan dengan repository aktual; jangan membuat ulang routing.

```text
src/
  app/
    (tabs)/
      reports.tsx
      map.tsx
  components/
    reports/
      ReportSearchBar.tsx
      ReportFilterBar.tsx
      ReportList.tsx
      ReportSyncStatus.tsx
      OfflineBanner.tsx
  hooks/
    useReportSearch.ts
    useRealtimeReports.ts
    useNetworkStatus.ts
    useReportSync.ts
  services/
    reports/
      reportRepository.ts
      reportSearchService.ts
      reportRealtimeService.ts
      reportSyncService.ts
      reportOutboxService.ts
    network/
      networkService.ts
    background/
      backgroundSyncTask.ts
  providers/
    realtime/
      RealtimeProvider.ts
      SupabaseRealtimeProvider.ts
  database/
    sqlite/
      database.ts
      reportCacheRepository.ts
      outboxRepository.ts
  types/
    report.ts
    search.ts
    sync.ts
```

Folder final harus mengikuti struktur source yang benar-benar digunakan oleh proyek. Jangan membuat `src/src` atau mengedit folder template/example yang tidak aktif.

## 14. Pembagian Tugas

### Anggota 1 — Naufal
**Lead System Architect & Security Engineer**
- Audit arsitektur P9/P10, backend, package, auth, dan database.
- Menentukan kontrak `Report`, `SearchCriteria`, `RealtimeEvent`, `SyncState`, dan `OutboxOperation`.
- Menentukan data flow, provider abstraction, idempotency, conflict policy, dan error taxonomy.
- Mengimplementasikan integrasi backend/realtime service atau bagian provider sesuai kesepakatan.
- Meninjau Supabase RLS, schema, credential handling, dan authorization.
- Memimpin integrasi dan Architect's Audit Protocol.

**Output:** arsitektur, types/contracts, backend/realtime integration, security/RLS review, integration audit.

### Anggota 2 — Syahril
**Lead Frontend & Performance Specialist**
- Membuat UI search/filter laporan.
- Mengintegrasikan RxJS pipeline melalui hook/service yang disepakati.
- Menampilkan list dan marker state dari repository.
- Membuat indikator online/offline/reconnecting/stale/pending/synced.
- Membuat loading, empty, error, retry, dan offline state.
- Memastikan update realtime tidak membuat flicker atau render berlebihan.
- Menjaga UX agar pengguna tahu apakah laporan sudah terkirim atau masih pending.

**Output:** search/filter UI, RxJS hook integration, realtime UI updates, network/sync status UX.

### Anggota 3 — Robi
**Lead Hardware & Spatial/Network Engineer**
- Mengimplementasikan network monitoring dengan NetInfo.
- Mengimplementasikan local cache/outbox SQLite atau integrasi service lokal sesuai kontrak.
- Mengimplementasikan reconnect flow dan deferred sync worker dengan Expo BackgroundTask/TaskManager bila didukung environment.
- Menangani lifecycle app/network, retry/backoff, dan cleanup.
- Menghubungkan perubahan data ke peta/LBS P9 tanpa merusak tracking.
- Menguji airplane mode, jaringan pulih, app background/foreground, dan device behavior.

**Output:** network service, local cache/outbox, background sync worker, reconnect/reliability tests.

### Aturan Kolaborasi
- Naufal menetapkan kontrak sebelum coding paralel.
- Robi dan Syahril tidak mengubah kontrak data sepihak.
- Setiap anggota bekerja di branch masing-masing.
- Hindari konflik edit file; koordinasikan file integrasi bersama.
- Gunakan commit terpisah dan review sebelum merge.
- Jangan menimpa implementasi P9/P10.

## 15. Urutan Implementasi

1. Audit repository dan status P9/P10.
2. Audit backend/provider yang sudah tersedia; tentukan apakah Supabase sudah dikonfigurasi.
3. Sepakati model `Report`, search criteria, event, cache, outbox, dan sync state.
4. Siapkan schema/migration dan RLS bila backend Supabase memang digunakan.
5. Implementasikan report repository dan cache lokal.
6. Implementasikan RxJS search/filter pipeline.
7. Implementasikan realtime provider/subscription dan lifecycle.
8. Implementasikan NetInfo monitoring dan offline UX.
9. Implementasikan outbox/reconnect sync untuk operasi yang didukung.
10. Implementasikan background worker untuk deferred sync jika environment mendukung.
11. Integrasikan update laporan dengan list dan map.
12. Uji online/offline/reconnect, duplicate event, race condition, auth/RLS, dan background limitations.
13. Jalankan typecheck/lint/test dan Architect's Audit Protocol.

## 16. Pengujian Minimum

### RxJS
- Mengetik beberapa karakter cepat hanya menghasilkan pencarian setelah debounce.
- Query identik tidak memicu request ulang.
- Query baru menggantikan pencarian lama.
- Error satu request tidak mematikan stream.
- Unsubscribe dilakukan saat screen/hook tidak aktif.
- Offline search memakai cache dan memberi label yang benar.

### Realtime
- Laporan baru muncul pada client lain tanpa refresh.
- Perubahan status tampil pada client lain.
- Event duplikat tidak membuat duplicate report.
- Event lama tidak menimpa data baru.
- Subscription dibersihkan saat screen/service berhenti.
- Setelah disconnect/reconnect, reconciliation fetch mengambil perubahan yang terlewat.
- User tidak menerima data yang tidak diizinkan RLS.

### Offline/Outbox
- Airplane mode tetap menampilkan cache.
- Operasi yang didukung ditandai pending, bukan success.
- Setelah online, operasi dikirim satu kali secara idempotent.
- Error sementara retry dengan backoff.
- Error permanen ditampilkan dan tidak di-loop terus.
- Konflik status tidak menimpa source of truth server.
- Backend unavailable ditangani meskipun NetInfo menunjukkan internet.

### Background
- Task didefinisikan di module scope.
- Task aman dijalankan lebih dari sekali.
- Task tidak menjalankan WebSocket.
- Task memeriksa network dan outbox.
- Keterbatasan OS dicatat.
- Pengujian dilakukan pada development build/perangkat yang sesuai.

### Regression
- Map/LBS P9 tetap berfungsi.
- SecureStore, Document Vault, dan permission P10 tetap berfungsi.
- Tidak ada secret/service-role key di bundle atau logs.

## 17. Architect's Audit Protocol

### Check 1 — Data Flow and RxJS
- [ ] Debounce, distinct, switchMap benar urutannya.
- [ ] Query lama tidak menimpa hasil baru.
- [ ] Error tidak mematikan stream.
- [ ] Subscription di-cleanup.

### Check 2 — Realtime and Security
- [ ] Subscription terarah pada tabel/event yang dibutuhkan.
- [ ] RLS aktif dan diuji.
- [ ] Tidak ada service_role key di client.
- [ ] Event handler idempotent dan memeriksa timestamp/version.
- [ ] Reconnect melakukan reconciliation.

### Check 3 — Offline and Background Reliability
- [ ] Cache tampil saat offline.
- [ ] Pending operation tidak diklaim terkirim.
- [ ] Retry memiliki backoff dan batas.
- [ ] Background worker idempotent dan dapat dihentikan OS.
- [ ] Tidak mengandalkan WebSocket di background.

### Check 4 — Regression and Cleanup
- [ ] Map/LBS P9 tidak rusak.
- [ ] SecureStore/Document Vault P10 tidak rusak.
- [ ] Listener/channel/task dibersihkan.
- [ ] Tidak ada credential/secret di log atau bundle.
- [ ] Typecheck/lint/test dilaporkan jujur.

## 18. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Query lama menimpa hasil terbaru | `switchMap`, request identity, dan state handling |
| Terlalu banyak request | `debounceTime` dan `distinctUntilChanged` |
| Event realtime terduplikasi | Idempotent upsert berdasarkan report ID |
| Event terlewat saat offline/background | Reconciliation fetch saat reconnect/foreground |
| WebSocket dianggap selalu aktif | Batasi realtime ke foreground; gunakan background task terjadwal |
| Background task tidak tepat waktu | Jadikan deferred sync, bukan emergency alert |
| Outbox mengirim duplikat | Idempotency key dan status processing |
| Konflik perubahan status | Server-authoritative status dan role-based authorization |
| RLS salah konfigurasi | Uji sebagai user/role berbeda sebelum demo |
| Internet ada tetapi backend mati | Tangani request error terpisah dari NetInfo |
| Expo Go membatasi background execution | Development build dan uji perangkat fisik |

## 19. Definition of Done

Pertemuan 11 selesai jika:

1. RxJS search/filter memakai `debounceTime`, `distinctUntilChanged`, dan `switchMap`.
2. Query baru tidak dapat ditimpa hasil query lama.
3. Event realtime laporan baru/perubahan status memperbarui aplikasi aktif.
4. Event handler idempotent dan subscription lifecycle dibersihkan.
5. Offline app tetap menampilkan cache lokal.
6. Operasi offline yang didukung ditandai pending dan tidak diklaim terkirim.
7. Reconnect melakukan sinkronisasi/reconciliation.
8. Background worker, jika diimplementasikan, hanya melakukan pekerjaan deferred yang aman dan sesuai batas OS.
9. RLS dan credential handling diperiksa jika Supabase digunakan.
10. Fitur P9/P10 tetap berfungsi.
11. Kontribusi ketiga anggota terlihat melalui Git commit.
12. Typecheck/lint/test dan keterbatasan platform dilaporkan jujur.

## 20. Di Luar Ruang Lingkup Pertemuan 11

- Jaminan WebSocket aktif ketika aplikasi force-closed.
- Emergency alert delivery guarantee tanpa push notification.
- Full background GPS tracking.
- Sistem dispatch petugas bencana skala produksi.
- Advanced conflict-free replicated data type (CRDT).
- Analitik/big data pipeline.
- Migrasi backend besar tanpa persetujuan.
- Penggantian seluruh arsitektur aplikasi.

## 21. Referensi Teknis

Gunakan dokumentasi sesuai versi dependency yang benar-benar terpasang:
- RxJS API: https://rxjs.dev/api
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Expo BackgroundTask: https://docs.expo.dev/versions/latest/sdk/background-task/
- Expo TaskManager: https://docs.expo.dev/versions/latest/sdk/task-manager/
- NetInfo: https://github.com/react-native-netinfo/react-native-netinfo
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/

**Aturan akhir:** audit versi dan struktur proyek terlebih dahulu. Jangan mengarang hasil pengujian, credential, backend, atau kemampuan background yang tidak tersedia.
