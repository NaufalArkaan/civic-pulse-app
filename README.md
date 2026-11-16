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
- **Tanggung Jawab:**
  - **P9:** Komponen UI peta deklaratif, optimasi rendering Native Map (`tracksViewChanges`), memoization (`React.memo`, `useMemo`, `useCallback`), kartu detail laporan interaktif, kontrol interval, banner status, penanganan Safe Area dinamis, dan aksesibilitas (WCAG AA/AAA).
  - **P10:** Antarmuka Document Vault deklaratif, virtualisasi daftar berkas (`FlatList`), komponen pratinjau dokumen (`VaultFilePreviewModal`), dialog edukasi privasi Just-In-Time (`VaultJitModal`), ringkasan metrik penyimpanan sandbox, masking data sensitif (NIK/Token), konfirmasi penghapusan aman, dan feedback toast sukses.
- **Output:**
  - `src/components/map/` (`CivicMap`, `ReportMarker`, `UserLocationMarker`, `SelectedReportCard`, `MapControls`, `LocationStatusBanner`).
  - `src/components/vault/` (`VaultHeader`, `SecureStoreCard`, `VaultFileItem`, `VaultFileList`, `VaultEmptyState`, `VaultPermissionNotice`, `VaultFilePreviewModal`, `VaultJitModal`).
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

