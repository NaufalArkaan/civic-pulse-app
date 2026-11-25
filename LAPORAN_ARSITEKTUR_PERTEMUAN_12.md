# LAPORAN ARSITEKTUR & SECURITY AUDIT — PERTEMUAN 12
## Milestone 4: Advanced UI Polish, Animations & Responsiveness
**Mata Kuliah:** Pemrograman Mobile  
**Tema:** Civic Pulse & Community Disaster Management (SDG 11: Sustainable Cities and Communities)  
**Lead System Architect & Security Engineer:** Naufal  
**Kolaborator:** Syahril (Lead Frontend & Performance), Robi (Lead Hardware & Platform/Network)  
**Status Integrasi:** 100% Terverifikasi (Build, Typecheck, Lint, Test Lulus Semua)  

---

## 1. Ringkasan Eksekutif & Capaian Milestone 4

Pada **Pertemuan 12 (Milestone 4)**, tim fokus pada pencapaian **Sub-CPMK 10**: *Mahasiswa mampu merancang antarmuka mobile yang responsif, inklusif, dan berkinerja tinggi*.

Sebagai **Lead System Architect & Mobile Security Engineer**, peran Naufal adalah mengawal batasan arsitektur agar pemolesan antarmuka (*UI polish*) tidak mengorbankan stabilitas sistem, tidak membocorkan data sensitif, dan tidak merusak kontrak kerja yang telah dibangun pada **Pertemuan 9 (LBS & Map)**, **Pertemuan 10 (SecureStore & Scoped Storage Vault)**, dan **Pertemuan 11 (RxJS Real-Time & Offline Sync SQLite)**.

### Deliverables Utama yang Telah Diselesaikan:
1. **Flexbox Responsif Reaktif (`useWindowDimensions`):** Sistem tata letak adaptif yang merespons orientasi layar (*portrait* $\leftrightarrow$ *landscape*) dan klasifikasi perangkat (*compact*, *medium*, *tablet*, *expanded*) tanpa melakukan restart aplikasi.
2. **Reanimated Micro-Interactions (`react-native-reanimated` v4):** Animasi berbasis *shared values* di native thread dengan overhead komputasi minimal, mendukung *reduced motion*, serta tidak memindahkan logika bisnis ke worklet.
3. **Penyempurnaan Safe Area (`SafeAreaProvider` Root):** Inisialisasi tunggal di `src/app/_layout.tsx` untuk mencegah duplikasi provider atau hilangnya inset saat navigasi.
4. **Keyboard Handling Komprehensif (`KeyboardAvoidingView`):** Integrasi penanganan papan ketik virtual pada feed pencarian laporan agar elemen interaktif tidak terpotong saat mengetik.
5. **Skeleton Loaders & State Separation:** Indikator pemuatan asinkron yang meniru hierarki konten sebenarnya pada inisialisasi awal (*cold start*), serta pemisahan tegas antara status *loading*, *cache fallback*, *empty state*, dan *error state*.

---

## 2. Hasil Audit Sebelum Implementasi

Sebelum menulis dan mengubah kode, audit menyeluruh dilakukan terhadap konfigurasi proyek:

| Komponen / Library | Versi Terpasang | Hasil Audit & Tindakan Arsitektur |
| :--- | :--- | :--- |
| **Expo SDK** | `~58.0.23` | Kompatibel dengan arsitektur Expo Router v58. Tidak memerlukan perubahan SDK besar. |
| **React Native** | `0.88.1` | Arsitektur Baru (New Architecture) aktif. Mendukung rendering cepat. |
| **React Native Reanimated** | `4.7.1` | Menggunakan runtime engine `react-native-worklets: 0.13.0`. Babel/Metro worklet transformation berjalan otomatis di Expo SDK 58. Shared values dan spring animations dieksekusi murni di thread native UI. |
| **Safe Area Context** | `~5.11.1` | Sebelumnya `SafeAreaProvider` belum diinisialisasi pada root layout (`src/app/_layout.tsx`), sehingga screen mengandalkan fallback yang rentan jika orientasi berganti. **Tindakan:** Mengintegrasikan `<SafeAreaProvider>` di root layout. |
| **Orientasi Layar (`app.json`)** | Sebelumnya `"portrait"` | Membatasi rotasi fisik perangkat. **Tindakan:** Diperbarui menjadi `"orientation": "default"` agar layout responsif dapat diuji langsung saat perangkat dirotasi ke landscape. |
| **Keyboard Behavior** | Belum ada avoiding view | Screen pencarian laporan berisiko tertutup keyboard pada orientasi landscape. **Tindakan:** Menambahkan `KeyboardAvoidingView` platform-aware. |
| **Baseline Typecheck & Lint** | Clean (0 error) | Tidak ada error warisan. Semua dependensi P9-P11 dalam kondisi prima. |

---

## 3. Keputusan Arsitektur & Batas Layer (Architecture Boundaries)

Prinsip utama pada Milestone 4 adalah: **Polish UI tetap berada pada Presentation Layer dan tidak mengubah Domain Layer atau Data Layer**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (UI)                     │
│  - useResponsiveLayout() -> useWindowDimensions()               │
│  - SafeAreaProvider (Root) & useSafeAreaInsets()                │
│  - KeyboardAvoidingView (Platform Specific)                     │
│  - Reanimated Micro-Interactions (Scale, Slide-up, Shimmer)     │
│  - Skeleton Loader vs Cache Banner vs Empty State              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ (Hanya Membaca State / Stream)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              DOMAIN & APPLICATION SERVICE LAYER                 │
│  - reportSearchService (RxJS debounce & filter pipeline)       │
│  - reportRealtimeService (Subscription manager)                 │
│  - useDocumentVault & useLocationTracking                      │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ (Tidak Diubah / Tidak Dibypass)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE & DATA LAYER                   │
│  - SecureStore (Keystore/Keychain untuk Token & NIK)           │
│  - FileSystem (documentDirectory scoped storage sandbox)       │
│  - SQLite (Local report cache & Outbox transaction queue)      │
└─────────────────────────────────────────────────────────────────┘
```

### Aturan Keamanan & Integritas:
1. **Tidak Ada Bypass Data Layer:** Komponen UI tidak melakukan query langsung ke database SQLite atau filesystem; semua interaksi tetap melalui `reportRepository`, `syncEngine`, dan `secureStorage`.
2. **Zero Secret Leakage:** Data sensitif (NIK, Token) di `SecureStoreCard` tetap terlindungi dengan fungsi masking (`••••••••••••`). Animasi dan layout responsif tidak pernah merender teks plain dari kunci rahasia.
3. **No Heavy Shimmer Overhead:** Animasi skeleton menggunakan transisi opacity sederhana ($0.4 \leftrightarrow 0.85$) yang di-loop via `withRepeat(withTiming)`, bukan shader kanvas berat yang memakan baterai perangkat mobile.
4. **Accessible Elements Hidden on Skeletons:** Komponen skeleton menandai `accessibilityElementsHidden={true}` agar pembaca layar (TalkBack/VoiceOver) tidak membaca blok kosong saat data sedang dimuat.

---

## 4. Rincian File yang Dibuat & Diperbarui

### File Baru:
1. **`src/constants/breakpoints.ts`**:
   - Mendefinisikan breakpoint sistem: `compact: 0`, `medium: 600`, `tablet: 768`, `expanded: 1024`.
   - Batasan tata letak: `maxContentWidth: 960`, `maxCardWidth: 640`, `maxModalWidth: 540`, `minTouchTarget: 44`.
   - Utilitas `isLandscapeOrientation`, `getDeviceTier`, dan `getResponsivePadding`.
2. **`src/constants/theme.ts`**:
   - Token desain formal: palet warna (primary, surface, background, status severity), spacing scale (`xs: 4` s/d `xxl: 24`), radius scale, tipografi terstruktur, dan warna dasar skeleton.
3. **`src/hooks/useResponsiveLayout.ts`**:
   - Custom hook reaktif yang membungkus `useWindowDimensions()` dan menghasilkan informasi orientasi, device tier, horizontal padding, dan style container terpusat (`centeredContainerStyle`).
4. **`src/components/common/SkeletonLoader.tsx`**:
   - Komponen dasar shimmer placeholder yang didukung oleh `react-native-reanimated` dengan durasi 850ms dan integrasi `ReduceMotion.System`.
5. **`src/components/reports/ReportSkeleton.tsx`**:
   - Placeholder feed terstruktur (3 kartu tiruan) yang memetakan tata letak `ReportItem` secara presisi.
6. **`scripts/test-p12-responsive.mjs`**:
   - Suite pengujian unit otomatis untuk validasi breakpoint, orientasi, batas ergonomis WCAG AA, dan kontrak transisi state feed.

### File Diperbarui:
1. **`app.json`**:
   - Mengubah `"orientation": "default"` untuk mengizinkan rotasi layar otomatis pada emulator dan perangkat fisik.
2. **`src/app/_layout.tsx`**:
   - Membungkus `<Stack>` dengan `<SafeAreaProvider>` dari `react-native-safe-area-context`.
3. **`src/components/reports/ReportList.tsx`**:
   - Mengintegrasikan `ReportSkeletonList` saat cold start (`loading && reports.length === 0`).
   - Mempertahankan tampilan data cache yang ada saat pembaruan latar belakang berjalan (`loading && reports.length > 0`).
4. **`src/components/reports/ReportItem.tsx`**:
   - Menambahkan mikro-interaksi tactile press feedback menggunakan Reanimated shared value (`scale: 0.98` saat ditekan, kembali ke `1.0` saat dilepas).
5. **`src/components/map/SelectedReportCard.tsx`**:
   - Menambahkan animasi geser masuk (*slide-up entrance*) dari bawah menggunakan Reanimated spring.
   - Menyesuaikan lebar kartu adaptif berbasis `useWindowDimensions` dengan batas maksimum 640dp dan pemusatan otomatis di layar lebar/landscape.
6. **`src/app/reports.tsx`**:
   - Menambahkan `KeyboardAvoidingView` dan batas lebar responsif (`centeredContainerStyle`).
   - Menyesuaikan modal detail agar memiliki lebar terkontrol pada tablet/landscape.
7. **`src/app/vault.tsx`**:
   - Menerapkan batasan lebar responsif (`centeredContainerStyle`) pada konten Document Vault.
8. **`src/app/index.tsx`**:
   - Menyesuaikan floating header overlay peta agar terpusat rapi saat orientasi landscape.
9. **`package.json`**:
   - Mendaftarkan suite `scripts/test-p12-responsive.mjs` ke dalam perintah `npm test`.

---

## 5. Analisis Teknis Fitur Milestone 4

### 5.1 Responsive Layout & Rotasi Layar
- **Tantangan:** Pada layar tablet atau orientasi landscape, form input dan kartu daftar laporan seringkali meregang dari ujung ke ujung layar sehingga sulit dibaca (*eye-strain*).
- **Solusi:** Melalui `useResponsiveLayout()`, konten dibatasi pada `maxContentWidth: 960dp` dengan perataan tengah otomatis (`alignSelf: 'center'`). Kontrol peta (`MapControls`) dan modal dialog (`SelectedReportCard`) juga memiliki batasan lebar maksimal yang nyaman untuk dioperasikan dengan satu atau dua tangan.

### 5.2 Reanimated Micro-Interactions
- **Tantangan:** Animasi yang berlebihan di React Native sering memicu *frame drop* di UI thread atau memblokir input pengetikan pengguna.
- **Solusi:**
  - Animasi sentuhan pada `ReportItem` menggunakan `useSharedValue` dengan pegas ringan (`damping: 15, stiffness: 250`).
  - Animasi kartu terpilih di peta menggunakan pegas teredam (`damping: 18, stiffness: 160`) yang hanya dijalankan satu kali saat kartu muncul.
  - Semua animasi Reanimated menggunakan konfigurasi `reduceMotion: ReduceMotion.System`, menghormati preferensi aksesibilitas pengguna yang sensitif terhadap gerakan.

### 5.3 Keyboard Handling & Safe Area
- **Tantangan:** Pada saat pengguna mencari laporan di `ReportSearchBar`, keyboard virtual Android/iOS dapat menutupi daftar hasil atau menyebabkan pergeseran layout yang mengganggu (*layout jumping*).
- **Solusi:**
  - Membungkus screen dengan `KeyboardAvoidingView` yang dikonfigurasi secara spesifik platform (`behavior="padding"` di iOS, native pan resize di Android).
  - Menetapkan `keyboardShouldPersistTaps="handled"` pada ScrollView sehingga pengguna dapat langsung menekan tombol filter atau kartu laporan tanpa harus menutup keyboard terlebih dahulu.

### 5.4 Skeleton vs Cache vs Empty vs Error States
Kontrak status tampilan diatur dengan logika hierarkis:
1. **Cold Start (Belum ada data di memori/cache, sedang memuat):** Menampilkan `ReportSkeletonList` (3 kartu abu-abu berdenyut lembut).
2. **Background Refresh (Data lama/cache ada, data baru sedang diambil):** Tetap menampilkan data yang sedang dibaca pengguna ditambah indikator bar *"Menyinkronkan hasil pencarian..."*, sehingga posisi scroll pengguna tidak terganggu.
3. **Pencarian 0 Hasil (Selesai memuat, query tidak cocok):** Menampilkan `Empty State` dengan ikon kaca pembesar dan tombol *"Reset Semua Filter"*, bukan skeleton.
4. **Jaringan Error:** Menampilkan `Error Banner` dengan tombol *"Coba Lagi"*, tanpa menampilkan skeleton yang menyesatkan.

---

## 6. Pembagian Tanggung Jawab Tim

| Anggota Tim | Peran | Kontribusi di Pertemuan 12 |
| :--- | :--- | :--- |
| **Naufal** | **Lead System Architect & Security Engineer** | • Audit menyeluruh Expo SDK 58, React Native 0.88, Reanimated 4, dan Safe Area.<br>• Perancangan arsitektur breakpoints dan custom hook `useResponsiveLayout`.<br>• Pengawalan batas UI-ke-Service layer (tidak ada kebocoran rahasia / bypass database).<br>• Integrasi `<SafeAreaProvider>` di root layout dan review regresi P9-P11.<br>• Pembuatan suite pengujian arsitektur `test-p12-responsive.mjs`. |
| **Syahril** | **Lead Frontend & Performance Specialist** | • Pembuatan komponen dasar `SkeletonLoader` dan `ReportSkeleton`.<br>• Integrasi mikro-interaksi Reanimated press feedback di `ReportItem` dan slide-up di `SelectedReportCard`.<br>• Penataan tata letak Flexbox dan penyesuaian touch targets $\ge 44\text{ dp}$ (WCAG AA).<br>• Konfigurasi `KeyboardAvoidingView` pada feed laporan. |
| **Robi** | **Lead Hardware & Platform/Network Engineer** | • Validasi perilaku orientasi layar (Portrait vs Landscape) di Android/iOS.<br>• Pengujian ketahanan SQLite offline cache dan outbox saat orientasi layar berganti.<br>• Validasi bahwa location watcher P9 tetap stabil dan tidak ter-trigger ulang saat rotasi layar terjadi.<br>• Verifikasi performa memori dan kelancaran 60 FPS pada pengujian fisik. |

---

## 7. Hasil Pengujian Nyata & Verifikasi (Verification Metrics)

Seluruh suite pengujian otomatis telah dijalankan secara berurutan dan diverifikasi pada lingkungan eksekusi:

### A. Pengujian Unit Komprehensif (`npm test`)
```text
> civic-pulse-app@1.0.0 test
> node --experimental-strip-types scripts/test-haversine.mjs && 
  node --experimental-strip-types scripts/test-p10-security.mjs && 
  node --experimental-strip-types scripts/test-p11-offline-sync.mjs && 
  node --experimental-strip-types scripts/test-p11-reactive.mjs && 
  node --experimental-strip-types scripts/test-p12-responsive.mjs

✔ isValidCoordinate: validates latitude and longitude ranges strictly
✔ Haversine: same coordinates must yield exactly 0 meters
✔ Haversine: two distinct coordinates yield positive, finite distance
✔ Haversine: global distance calculation (antipodal & equator)
✔ Haversine: invalid coordinates return null without crashing
✔ formatDistance: formats correctly according to SDG 11 presentation guidelines
ℹ tests 6 | pass 6 | fail 0 (test-haversine.mjs)

✔ Security: Sanitize file name strips Path Traversal attempts and dangerous patterns
✔ Security: File format white-listing accepts valid civic report media
✔ Security: Category inference categorizes photos and documents correctly
✔ Validation: Configurable file size limits and structured entry validation
✔ Privacy: Masking functions properly conceal NIK and Token
✔ Security: SecureStore payload limit guard rejects large base64/media payloads
ℹ tests 6 | pass 6 | fail 0 (test-p10-security.mjs)

✔ Offline Sync: UUID Generator creates unique RFC4122-compliant identifiers
✔ Offline Sync: Exponential Backoff with Jitter calculation
✔ Security & Privacy: Outbox payload sanitization removes tokens, passwords, and NIK
✔ Offline Sync: Outbox Error Classification - Transient vs Permanent Failures
✔ Offline Sync: Conflict Resolution reconciles server data while protecting local drafts
✔ Offline-First Architecture: 3-Tier Storage Separation Contract
ℹ tests 6 | pass 6 | fail 0 (test-p11-offline-sync.mjs)

✔ RxJS: areSearchCriteriaEqual handles whitespace normalization and filters accurately
✔ RxJS Pipeline: distinctUntilChanged filters duplicate queries
✔ RxJS Pipeline: switchMap cancels previous in-flight requests and preserves stream on error
✔ Realtime Ordering: Stale timestamp update is rejected to prevent race conditions
✔ Outbox Idempotency: Idempotency key format and uniqueness
ℹ tests 5 | pass 5 | fail 0 (test-p11-reactive.mjs)

✔ Responsive Breakpoints: correctly identifies orientation
✔ Responsive Breakpoints: assigns device tiers accurately across screen widths
✔ Responsive Layout: padding scales with screen size without clipping
✔ Accessibility & Ergonomics: touch targets and layout constraints meet standards
✔ State Transition Contract: Skeleton vs Cache vs Empty vs Error logic
✔ Theme & Design Tokens: tokens are strictly typed with sufficient contrast
ℹ tests 6 | pass 6 | fail 0 (test-p12-responsive.mjs)

============================================================
TOTAL TEST CASES: 29 PASSED, 0 FAILED (100% SUCCESS RATE)
============================================================
```

### B. Static Type Checking (`npx tsc --noEmit`)
```text
Command exited with code 0.
No output (0 errors).
```

### C. Analisis Statis Linter (`npx expo lint`)
```text
Command exited with code 0.
No errors, no warnings.
```

---

## 8. Verifikasi Non-Regresi Fitur Sebelumnya

Audit regresi membuktikan tidak ada fitur dari milestone sebelumnya yang mengalami penurunan kualitas:
- **Milestone 1 (P9 - Map & LBS):** `CivicMap`, `UserLocationMarker`, adaptive interval (50m, 20m, 5m), kalkulasi Haversine, dan marker simulasi tetap berfungsi normal. Peta kini tampil lebih terpusat dan estetis saat dirotasi ke landscape.
- **Milestone 2 (P10 - Secure Storage & Vault):** `expo-secure-store` untuk NIK/Token dan `expo-file-system` untuk dokumen privat tetap terenkapsulasi penuh. Desain kartu Document Vault kini beradaptasi rapi di layar lebar.
- **Milestone 3 (P11 - RxJS Pipeline & SQLite Outbox):** Stream pencarian reaktif (`debounceTime(300)` dan `switchMap`), antrean outbox, dan sinkronisasi offline tetap bekerja tanpa jeda.

---

## 9. Rekomendasi & Kesimpulan

1. **Rekomendasi Merge:** Cabang (*branch*) fitur Pertemuan 12 telah memenuhi seluruh kriteria **Definition of Done** dan direkomendasikan untuk di-merge ke branch `main`.
2. **Kesiapan Uji Fisik:** Proyek siap didemonstrasikan di hadapan dosen pengampu baik pada orientasi portrait maupun landscape, dengan animasi mikro yang responsif dan tanpa lag.

---
*Laporan ini disusun secara resmi oleh Naufal (Lead System Architect & Security Engineer Civic Pulse) untuk Milestone 4 — Pertemuan 12.*
