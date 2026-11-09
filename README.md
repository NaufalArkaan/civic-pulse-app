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

### Anggota 2: Syahril (Lead Frontend & Performance Specialist)
- **Tanggung Jawab:** Komponen UI peta deklaratif, optimasi rendering Native Map (`tracksViewChanges`), memoization (`React.memo`, `useMemo`, `useCallback`), kartu detail laporan interaktif, kontrol interval, banner status, penanganan Safe Area dinamis, dan aksesibilitas (WCAG AA/AAA).
- **Output:** `src/components/map/` (`CivicMap`, `ReportMarker`, `UserLocationMarker`, `SelectedReportCard`, `MapControls`, `LocationStatusBanner`).

### Anggota 3: Robi (Hardware Integration & Spatial Math Engineer)
- **Tanggung Jawab:** Integrasi hardware sensor `expo-location` dan `react-native-maps`, implementasi lifecycle watcher dan cleanup, serta kalkulasi jarak Haversine.
- **Output:** `src/hooks/useLocationTracking.ts`, `src/utils/haversine.ts`, `src/utils/formatDistance.ts`.

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

## 5. Catatan Debugging Kompatibilitas Android & iOS

Pada saat pengujian awal di perangkat Android, ditemukan runtime error fatal:
```text
Error while updating property 'accessibilityRole' of a view managed by: RCTView
Invalid accessibility role value: region
```
- **Penyebab:** Properti W3C ARIA web `accessibilityRole="region"` digunakan pada container `SelectedReportCard.tsx`. Pada runtime native Android (React Native core `ReactAccessibilityDelegate.kt`), peran `"region"` tidak terdaftar dalam enum native accessibility role Android dan menyebabkan `IllegalArgumentException`. Pada iOS, nilai ini diabaikan sehingga tidak menyebabkan crash pada iPhone.
- **Solusi:** Nilai `accessibilityRole` diperbarui menjadi `"summary"` yang merupakan role semantik resmi dan terdaftar baik di Android (`android.view.View` dengan `roleDescription = summary`) maupun di iOS (`UIAccessibilityTraitSummaryElement`). Crash berhasil terselesaikan secara tuntas tanpa merusak kompatibilitas iOS maupun aksesibilitas TalkBack/VoiceOver.
