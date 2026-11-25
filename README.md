# Civic Pulse (SDG 11) - Milestone 1: Modul LBS & Interactive Mapping Engine

Civic Pulse adalah aplikasi mobile berbasis React Native & Expo untuk pelaporan kerusakan infrastruktur publik dan mitigasi bencana komunitas dalam kerangka **SDG 11 (Sustainable Cities and Communities)**.

Dokumen ini merangkum arsitektur, pembagian peran, dan panduan pengujian untuk **Milestone 1 (Pertemuan 9)**.

---

## 1. Arsitektur & Separation of Concerns

Modul LBS dirancang dengan pemisahan tanggung jawab yang modular dan *loosely-coupled*:

```text
src/
├── app/                        # Expo Router Pages
│   ├── _layout.tsx             # Root layout & Stack navigator
│   └── index.tsx               # MapScreen: Orkestrasi Hook & Komponen UI
├── components/
│   └── map/                    # Presentational Components (UI Layer - Syahril)
│       ├── CivicMap.tsx        # MapView wrapper & fallback region
│       ├── UserLocationMarker.tsx # Custom pulse marker posisi pengguna
│       ├── ReportMarker.tsx    # Marker laporan berdasarkan kategori & severity
│       ├── SelectedReportCard.tsx # Bottom card detail & display jarak Haversine
│       ├── MapControls.tsx     # Selektor mode adaptif & tombol 'Lokasi Saya'
│       └── LocationStatusBanner.tsx # Status bar informatif & penanganan error
├── constants/
│   ├── map.ts                  # Konfigurasi zoom & Fallback Region (Malang/UMM)
│   ├── sampleReports.ts        # Mock data berlabel "Data Simulasi"
│   └── tracking.ts             # Adaptive distanceInterval (low: 50m, balanced: 20m, high: 5m)
├── hooks/
│   └── useLocationTracking.ts  # Hardware LBS Hook (Foreground watcher, cleanup, error)
├── types/
│   ├── location.ts             # Coordinate, TrackingMode, LocationStatus
│   ├── report.ts               # CivicReport, Category, Severity
│   └── components.ts           # Props contract UI components
└── utils/
    ├── haversine.ts            # Validasi koordinat & kalkulasi jarak garis lurus
    └── formatDistance.ts       # Formatter jarak ramah pengguna (m / km)
```

---

## 2. Kontrak API & Pembagian Peran

### Anggota 1: Naufal (Lead System Architect & Security Engineer)
- **Tanggung Jawab:** Audit arsitektur, perancangan kontrak TypeScript, validasi keamanan LBS, konfigurasi adaptive interval, orkestrasi integrasi screen, serta Architect's Audit Protocol checklist.
- **Output:** `src/types/`, `src/constants/`, arsitektur `useLocationTracking`, integrasi `src/app/index.tsx`, dokumentasi arsitektur.

### Anggota 2: Syahril (Lead Frontend & Reactive UI Specialist)
- **Tanggung Jawab:**
  - **P9:** Komponen UI peta deklaratif, optimasi rendering Native Map (`tracksViewChanges`), memoization (`React.memo`, `useMemo`, `useCallback`), kartu detail laporan interaktif, kontrol interval, banner status, penanganan Safe Area dinamis, dan aksesibilitas (WCAG AA/AAA).
  - **P10:** Antarmuka Document Vault deklaratif, virtualisasi daftar berkas (`FlatList`), komponen pratinjau dokumen (`VaultFilePreviewModal`), dialog edukasi privasi Just-In-Time (`VaultJitModal`), ringkasan metrik penyimpanan sandbox, masking data sensitif (NIK/Token), konfirmasi penghapusan aman, dan feedback toast sukses.
  - **P11:** Antarmuka pencarian dan filter reaktif RxJS (`ReportSearchBar`, `ReportFilterBar`), feed laporan tervirtualisasi berbasis `FlatList` (`ReportList`, `ReportItem`), banner status jaringan dan sinkronisasi outbox ramah warga (`ReportSyncBanner`), integrasi screen feed laporan (`src/app/reports.tsx`), sinkronisasi marker peta dengan feed laporan live, serta pencegahan flicker rendering.
- **Output:**
  - `src/components/map/` (`CivicMap`, `ReportMarker`, `UserLocationMarker`, `SelectedReportCard`, `MapControls`, `LocationStatusBanner`).
  - `src/components/vault/` (`VaultHeader`, `SecureStoreCard`, `VaultFileItem`, `VaultFileList`, `VaultEmptyState`, `VaultPermissionNotice`, `VaultFilePreviewModal`, `VaultJitModal`).
  - `src/components/reports/` (`ReportSearchBar`, `ReportFilterBar`, `ReportSyncBanner`, `ReportItem`, `ReportList`).
  - `src/app/reports.tsx` (Screen Feed Laporan Reaktif & Real-Time).
  - `src/app/vault.tsx` (Screen Document Vault & Scoped Storage).

### Anggota 3: Robi (Lead Hardware & Spatial/Network Engineer)
- **Tanggung Jawab:**
  - **P9:** Integrasi hardware sensor `expo-location` dan `react-native-maps`, implementasi lifecycle watcher dan cleanup, serta kalkulasi jarak Haversine.
  - **P10:** Integrasi Scoped Storage sandbox `expo-file-system` (`documentDirectory`), operasi file privat (import, delete, missing verification, rollback atomic, orphan cleanup), validasi file (size & format), pencegahan double import, serta implementasi hook Just-In-Time Runtime Permission (`useRuntimePermissions`).
- **Output:**
  - `src/services/files/documentVault.ts` (Document Vault service & Scoped Storage).
  - `src/services/permissions/permissionService.ts` (JIT Runtime Permission Orchestrator).
  - `src/hooks/useRuntimePermissions.ts` (JIT Permission Hook).
  - `src/hooks/useDocumentVault.ts` (Document Vault Hook & double-tap guard).
  - `src/utils/fileValidation.ts` (Path traversal sanitizer, format allowlist, size validator).
  - `scripts/test-p10-security.mjs` (Security, path traversal, validation, and privacy test suite).

---

## 3. Protokol Keamanan & Kualitas (Mobile Security Engineering)

1. **Foreground Permission Only:** Aplikasi hanya meminta izin `requestForegroundPermissionsAsync`. Tidak ada izin background location yang diminta.
2. **Zero Coordinate Persistence:** Koordinat pengguna bersifat sementara (*in-memory*) dan tidak pernah disimpan ke `AsyncStorage`, `SQLite`, atau storage persisten lokal.
3. **Graceful Fallback:** Jika izin ditolak atau GPS nonaktif, `MapView` tetap dapat dibuka dengan wilayah demonstrasi aman (`DEFAULT_FALLBACK_REGION`) dan pengguna tetap dapat memeriksa laporan simulasi.
4. **Leak-Proof Watcher Cleanup:** Setiap pemanggilan `Location.watchPositionAsync` dikelola dengan cleanup `subscription.remove()` saat unmount maupun saat pergantian mode interval untuk mencegah *memory leak* dan *battery drain*.
5. **No Credential Exposure:** Tidak ada API key atau kredensial yang di-commit ke source control.

---

## 4. Cara Menjalankan & Memverifikasi

### Menjalankan Server Expo:
```bash
npx expo start
```
- Buka di Expo Go pada perangkat fisik Android atau Emulator Android.

### Menjalankan Typecheck:
```bash
npx tsc --noEmit
```

### Menjalankan Linter:
```bash
npx expo lint
```

### Menjalankan Pengujian Unit Spasial Haversine:
```bash
npm test
# atau
node --experimental-strip-types scripts/test-haversine.mjs
```

---

## 6. Milestone 2 (Pertemuan 10) — Offline-First Architecture & Secure Storage Integration

Milestone 2 mengimplementasikan fondasi pengelolaan data lokal aman (Sub-CPMK 8) dengan integrasi:
1. `expo-secure-store` untuk kredensial, token, dan NIK dummy (Hardware-Backed Keystore/Keychain).
2. `expo-file-system` (`documentDirectory`) untuk Document Vault privat berbasis Scoped Storage.
3. Just-In-Time (JIT) Runtime Permissions untuk kamera, lokasi, dan media picker.

### 6.1 Matriks Klasifikasi Data

| Jenis Data | Lokasi Penyimpanan | Mekanisme Keamanan |
| :--- | :--- | :--- |
| **Token, NIK Dummy, Kredensial** | `expo-secure-store` | Dienkripsi via Android Keystore / iOS Keychain. Nilai sensitif tidak pernah dicatat ke log konsol. Payload dibatasi maksimal 2 KB. |
| **Foto Kerusakan, Dokumen Mitigasi (PDF/TXT)** | `expo-file-system` (`documentDirectory/civic-pulse/vault/`) | Disimpan di sandbox privat aplikasi. Diisolasi oleh kernel OS Android/iOS (Scoped Storage). *Bukan enkripsi otomatis.* |
| **Metadata Berkas (ID, nama, ukuran, MIME, timestamp)** | Manifest JSON lokal (`metadata.json`) | Disimpan di subdirektori privat. Memiliki verifikasi status *missing* jika berkas fisik dihapus/desinkronisasi. |
| **State Sementara UI** | React Local State (`useState`, `useRef`) | Disimpan dalam memori volatil selama komponen aktif. Dibersihkan saat unmount. |

### 6.2 Pengujian Unit Keamanan & Sanitasi Berkas

Jalankan test suite keamanan Pertemuan 10:
```bash
node scripts/test-p10-security.mjs
```
Verifikasi mencakup:
- Pencegahan Path Traversal (`../../etc/passwd` -> `passwd`).
- Whitelisting format berkas (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`, `.txt`).
- Inferensi kategori berkas (`photo`, `document`, `other`).
- Masking NIK (`3573031204010001` -> `357303******0001`) dan Token (`civic_tok_****6a7b`).
- Payload size guard pada SecureStore (> 2 KB ditolak).

---

## 7. Milestone 3 (Pertemuan 11) — Real-Time Data Pipeline & Background Task Processing

Milestone 3 mengimplementasikan alur data reaktif tingkat lanjut menggunakan **RxJS** dan manajemen sinkronisasi offline (Sub-CPMK 9):

### 7.1 Komponen Inti Pertemuan 11
1. **RxJS Search & Filter Pipeline:** Menggunakan `debounceTime(300ms)`, `distinctUntilChanged(areSearchCriteriaEqual)`, dan `switchMap` untuk membatalkan pencarian lama dan mencegah *race condition*.
2. **Realtime Provider Architecture:** Mengabstraksikan aliran data event melalui `IRealtimeProvider`. Dilengkapi dengan `MockRealtimeProvider` berlabel jelas `[Simulasi Realtime / Development Provider]` dan `SupabaseRealtimeProvider` yang siap beralih ketika kredensial backend disuplai.
3. **Local Structured Cache & Outbox (SQLite):** Menggunakan `expo-sqlite` untuk menyimpan snapshot laporan dan antrean operasi offline (`outbox_operations`) dengan kunci idempotensi unik (`idempotencyKey`).
4. **Network Monitoring & Reconnect Reconciliation:** Menggunakan `@react-native-community/netinfo` untuk mendeteksi status online/offline dan memicu rekonsiliasi outbox secara otomatis saat jaringan pulih.
5. **PostgreSQL RLS Migrations:** Menyediakan skema database lengkap dan kebijakan keamanan Row Level Security pada `supabase/migrations/20261116000000_create_reports_table.sql`.

### 7.2 Pengujian Unit Reaktif RxJS & Ordering

Jalankan pengujian unit Pertemuan 11:
```bash
node scripts/test-p11-reactive.mjs
```
Pengujian memverifikasi:
- Debounce dan normalisasi kueri pencarian.
- `distinctUntilChanged` mengeliminasi kueri identik berulang.
- `switchMap` membatalkan request lama dan `catchError` menjaga stream tetap hidup.
- Idempotensi event realtime dan pencegahan *stale update* menimpa data yang lebih baru.
- Format dan keunikan kunci idempotensi pada antrean outbox.

---

## 8. Milestone 4 (Pertemuan 12) — Advanced UI Polish, Animations & Responsiveness

Milestone 4 berfokus pada penyempurnaan menyeluruh pengalaman pengguna (*UI Polish*), interaktivitas mikro berkinerja tinggi, dan adaptasi tata letak responsif terhadap berbagai ukuran layar dan orientasi (Sub-CPMK 10):

### 8.1 Komponen & Peningkatan Inti Pertemuan 12
1. **Responsive Viewport Engine (`useResponsiveLayout` & `breakpoints.ts`):**
   - Menggunakan `useWindowDimensions()` reaktif (bebas dari dimensi statis yang hanya di-mount sekali).
   - Klasifikasi breakpoint perangkat: `compact` (<600dp), `medium` (600–767dp), `tablet` (768–1023dp), dan `expanded` (>=1024dp).
   - Pembatasan lebar maksimum konten (`maxContentWidth: 960`, `maxCardWidth: 640`, `maxModalWidth: 540`) untuk mencegah peregangan berlebih pada tablet atau saat rotasi landscape.
2. **Reanimated Micro-Interactions (`react-native-reanimated` 4.x):**
   - `AnimatedPressable`: Komponen tombol sentuh dengan umpan balik pegas mikro (*scale 0.96* dengan `withSpring` dan `ReduceMotion.System`).
   - `FeedbackToast`: Banner umpan balik visual dan taktil yang halus setelah aksi CRUD (sukses simpan berkas, update status laporan).
   - `ReportSkeletonList` & `SkeletonLoader`: Animasi shimmer/pulse berbasis native thread tanpa overhead komputasi berlebih.
   - `SelectedReportCard`: Animasi transisi slide-up berpegas dinamis saat memilih marker pada peta.
   - Expand/Collapse filter panel pada `ReportFilterBar` untuk menghemat ruang vertikal pada layar kompak atau mode landscape.
3. **Keyboard Handling & Penghapusan Nested VirtualizedList:**
   - Mengeliminasi antipattern nested `ScrollView` pembungkus `FlatList` pada `reports.tsx` dengan menyatukan seluruh header feed (Sync Banner, Search Bar, Filter Chips, Error Alert, Feedback Toast) ke dalam `ListHeaderComponent`.
   - Konfigurasi `KeyboardAvoidingView` adaptif per platform (`behavior="padding"` di iOS dengan vertical offset insets, dan `"height"` di Android).
   - Menetapkan `keyboardShouldPersistTaps="handled"` agar interaksi pada filter chips dan cards responsif seketika tanpa harus menutup keyboard terlebih dahulu.
4. **Pemisahan State Presentasional Komprehensif:**
   - *Cold start initial loading*: Menampilkan `ReportSkeletonList` yang meniru kartu laporan.
   - *Cached content + refreshing*: Menjaga data yang sedang dibaca pengguna tetap tampil dengan banner cache lokal SQLite dan indikator sinkronisasi inline (tidak menimpa konten dengan skeleton).
   - *Empty state*: Tampilan ramah warga saat pencarian nihil, dilengkapi tombol cepat `🔄 Reset Semua Filter`.
   - *Error state*: Banner galat dengan aksi coba lagi `Coba Lagi`.
5. **Ergonomi & Aksesibilitas (WCAG AA/AAA):**
   - Seluruh target sentuh tombol interaktif memenuhi minimum $\ge 44\text{ dp}$.
   - Indikator status ganda non-warna (ikon emoji deskriptif + teks label tegas).

### 8.2 Pengujian Unit Responsif & Ergonomi

Jalankan pengujian unit Pertemuan 12:
```bash
node scripts/test-p12-responsive.mjs
```
Pengujian memverifikasi:
- Deteksi orientasi portrait vs landscape secara akurat.
- Penentuan tingkat perangkat (*compact*, *medium*, *tablet*, *expanded*).
- Penskalaan padding responsif dan batasan lebar kartu / modal.
- Kontrak pemisahan status tampilan (Skeleton vs Cache vs Empty vs Error).
- Validasi konstanta animasi pegas dan batas opacity skeleton.


