# LAPORAN PRESENTASI PROGRES — PERTEMUAN 9
## Milestone 1: Inisialisasi Modul LBS & Interactive Mapping Engine
**Mata Kuliah:** Pemrograman Mobile  
**Aplikasi:** Civic Pulse & Community Disaster Management (Tema SDG 11: Kota dan Permukiman Berkelanjutan)  
**Status Progres:** 100% Selesai & Teruji (Verified Baseline)  

---

## 1. Identitas Proyek & Anggota Tim

| Nama Anggota | Peran Tim | Fokus Kontribusi Utama |
| :--- | :--- | :--- |
| **Naufal** | **Lead System Architect & Mobile Security Engineer** | Arsitektur Modul LBS, Kontrak TypeScript, Konfigurasi Tracking Adaptif, Keamanan Privasi Lokasi, Integrasi Screen Utama, & Audit Protokol. |
| **Syahril** | **Lead Frontend & Performance Specialist** | Desain Komponen UI Peta, Custom Pulse Marker, Pin Kategori Bencana, Bottom Summary Card, Kontrol Interaktif (Pill & Recenter), Safe Area, & Optimasi Render. |
| **Robi** | **Lead Hardware & Spatial/Network Engineer** | Integrasi Native `expo-location` & `react-native-maps`, Custom Hook `useLocationTracking`, Subscription Lifecycle & Cleanup, Formulasi Matematis Geodesi Haversine, & Formatter Jarak. |

---

## 2. Ringkasan Eksekutif Milestone 1 (Pertemuan 9)

**Civic Pulse** adalah aplikasi mobile pelaporan kerusakan infrastruktur perkotaan dan tanggap bencana komunitas yang mendukung pencapaian **SDG 11 (Sustainable Cities and Communities)**.

Pada **Pertemuan 9**, tim telah menyelesaikan dan mengintegrasikan **Milestone 1**:
1. **Interactive Mapping Engine:** Menampilkan peta interaktif berbasis native (`react-native-maps`) dengan fallback region Malang/Kampus III UMM yang aman.
2. **Foreground LBS Watcher (`useLocationTracking`):** Melacak lokasi pengguna secara realtime dengan interval adaptif (`distanceInterval`: 50m, 20m, 5m) tanpa memory leak.
3. **Custom Markers & Spatial Calculation:** Menampilkan marker posisi pengguna dengan efek animasi pulse, marker laporan kerusakan dengan ikon & warna severity, serta menghitung jarak lurus menggunakan **rumus Haversine** secara presisi.

Seluruh kode telah diverifikasi dengan **0 error TypeScript**, **0 warning Linter**, dan **6/6 pengujian unit Haversine berhasil**.

---

## 3. Rincian Kontribusi Setiap Anggota

### A. Naufal — Lead System Architect & Mobile Security Engineer
1. **Audit Baseline & Kompatibilitas:**
   - Memastikan kompatibilitas antara Expo SDK 58, React Native 0.88, Expo Router, dan arsitektur native tanpa memecah dependensi yang ada.
2. **Perancangan Kontrak Data & TypeScript Types (`src/types/`):**
   - Mendefinisikan tipe koordinat standar `Coordinate` (`latitude: number`, `longitude: number`).
   - Mendefinisikan kontrak tracking `TrackingMode` (`'low' | 'balanced' | 'high'`) dan status `LocationStatus` (`'idle' | 'requesting-permission' | 'permission-denied' | 'loading' | 'tracking' | 'error'`).
   - Merancang kontrak laporan domain `CivicReport` mencakup kategori (*road-damage*, *flood*, *landslide*, *street-light*), severity (*low*, *medium*, *high*), dan timestamp.
3. **Konfigurasi Tracking Adaptif (`src/constants/tracking.ts`):**
   - Merancang parameter trade-off baterai vs akurasi:
     - `low`: Jarak 50 meter (Hemat baterai saat pengguna bergerak cepat/santai).
     - `balanced`: Jarak 20 meter (Default seimbang untuk pemantauan perkotaan).
     - `high`: Jarak 5 meter (Akurasi tinggi saat pengguna berada di dekat lokasi insiden).
4. **Data Simulasi Demonstrasi (`src/constants/sampleReports.ts`):**
   - Menyediakan titik koordinat valid di sekitar Kota Malang & Kampus III UMM (Jl. Raya Tlogomas, Jembatan Saxophone, Tegalgondo) yang diberi label eksplisit `[Data Simulasi]` agar tidak menyesatkan pengguna.
5. **Integrasi Screen Utama (`src/app/index.tsx`):**
   - Mengintegrasikan hasil kerja Robi (Hook LBS & Haversine) dengan hasil kerja Syahril (Komponen UI Peta & Card) ke dalam satu flow screen yang mulus dan kohesif.
6. **Keamanan & Privasi Lokasi (Architect's Audit):**
   - **Zero Location Persistence:** Koordinat pengguna hanya hidup di memori React selama sesi aktif; tidak pernah disimpan ke `AsyncStorage`, disk, atau file plain text.
   - **No Secret/Location Logging:** Tidak ada koordinat personal yang di-dump ke `console.log`.
   - **Foreground Scope Strictness:** Hanya meminta izin `foreground location`, mencegah pelanggaran privasi background tracking.

---

### B. Syahril — Lead Frontend & Performance Specialist
1. **Desain Komponen UI Peta (`src/components/map/`):**
   - `CivicMap.tsx`: Wrapper komponen `MapView` dengan gesture handling yang responsif, loading overlay, dan fallback region.
   - `UserLocationMarker.tsx`: Marker kustom penanda posisi pengguna dengan animasi cincin berkedip (*pulsing ripple effect*) berwarna biru terang, membedakan jelas antara pengguna dan titik insiden.
   - `ReportMarker.tsx`: Marker interaktif dengan pin visual berbeda untuk tiap kategori bencana, dilengkapi titik indikator warna severity (Kuning = Rendah, Oranye = Sedang, Merah = Bahaya/Tinggi).
   - `SelectedReportCard.tsx`: Floating card elegan di bagian bawah layar yang muncul ketika marker laporan ditekan, menampilkan judul laporan, alamat/deskripsi singkat, badge kategori, badge keparahan, waktu laporan, dan hasil jarak kalkulasi Haversine.
   - `MapControls.tsx`: Komponen tombol melayang (*floating action buttons*) dengan touch target minimum **44dp** sesuai pedoman iOS/Android:
     - Tombol Pill pemilih mode interval (50m, 20m, 5m).
     - Tombol Recenter "Lokasi Saya" untuk memusatkan kamera kembali ke pengguna.
   - `LocationStatusBanner.tsx`: Banner notifikasi di bagian atas layar yang memberikan status transparan: saat meminta izin, izin ditolak, memuat GPS, atau ketika GPS dinonaktifkan.
2. **Optimasi Performa UI:**
   - Membungkus komponen presentasional dengan `React.memo` serta menggunakan `useCallback` dan `useMemo` pada perhitungan props untuk mencegah re-render peta yang membebani GPU perangkat mobile.
3. **Safe Area & Cross-Platform Styling:**
   - Menggunakan `useSafeAreaInsets` dari `react-native-safe-area-context` agar kontrol peta dan banner status tidak tertutup oleh kamera punch-hole, notch, atau navigation bar Android.
   - Menyelesaikan issue kompatibilitas Android accessibility (`accessibilityRole="summary"`) agar tidak crash pada perangkat fisik.

---

### C. Robi — Lead Hardware & Spatial/Network Engineer
1. **Integrasi Native Module LBS:**
   - Mengintegrasikan library `expo-location` dan `react-native-maps` ke dalam proyek Expo.
2. **Custom Hook `useLocationTracking.ts`:**
   - Membangun hook reaktif yang mengelola siklus hidup GPS secara menyeluruh.
   - **Just-In-Time Permission Check:** Memeriksa status izin lokasi foreground saat hook dipasang; jika belum ada, menampilkan dialog izin sistem.
   - **Watcher Lifecycle & Single Subscription Lock:** Memanfaatkan `useRef<LocationSubscription | null>` untuk memastikan hanya ada **tepat satu watcher aktif**. Ketika pengguna mengganti mode tracking, watcher lama segera dihentikan via `subscription.remove()` sebelum watcher baru diinisialisasi.
   - **Async Unmount Protection:** Menggunakan ref `isMountedRef` untuk mencegah terjadinya `setState` setelah komponen dilepas (*unmounted*), mencegah memory leak dan warning React.
3. **Formulasi Matematis Geodesi (`src/utils/haversine.ts`):**
   - Mengimplementasikan rumus Haversine untuk menghitung jarak garis lurus bola bumi:
     $$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
     $$d = R \cdot \Delta\sigma \quad (\text{dengan } R = 6.371.000\text{ m})$$
   - **Validasi Geodetik Ketat:** Memastikan latitude dalam rentang $[-90^\circ, 90^\circ]$, longitude $[-180^\circ, 180^\circ]$, bukan `NaN`, dan bukan `Infinity`.
   - **Floating Point Numerical Clamping:** Nilai sinus diproteksi dalam rentang $[0, 1]$ untuk mencegah error komputasi `Math.sqrt` pada titik antipodal.
4. **Formatter Jarak Ramah Pengguna (`src/utils/formatDistance.ts`):**
   - Otomatis mengubah angka meter murni menjadi teks yang mudah dibaca:
     - Jika jarak $< 1.000\text{ m}$: ditampilkan dalam meter (contoh: `188 m`, `450 m`).
     - Jika jarak $\ge 1.000\text{ m}$: dikonversi ke kilometer dengan 2 angka di belakang koma (contoh: `1,25 km`, `5,40 km`).
     - Jika koordinat belum diperoleh: menampilkan fallback `"Menunggu lokasi..."` tanpa menampilkan angka palsu.

---

## 4. Fitur-Fitur Utama yang Telah Selesai di P9

```
┌─────────────────────────────────────────────────────────────┐
│                      CIVIC PULSE APP                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Status Banner: Tracking Aktif (Akurasi: ±12m)]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                         [Marker: Tanah Longsor]             │
│                                                             │
│          [User Pulse Marker]                                │
│                   │                                         │
│                   │ ~188 m (Haversine)                      │
│                   ▼                                         │
│         [Marker: Jalan Rusak Tlogomas]                      │
│                                                             │
│                                           [Mode: 20m]       │
│                                           [Mode: 5m]        │
│                                           [Lokasi Saya ⌖]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠ Jalan Berlubang Parah (Jl. Raya Tlogomas)             │ │
│ │ Kategori: Kerusakan Jalan  •  Tingkat Bahaya: Tinggi    │ │
│ │ Jarak dari Anda: 188 m                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

1. **Peta Interaktif Penuh (Full-screen Interactive Map):**
   - Menampilkan peta wilayah Malang Raya dan Kampus III UMM dengan navigasi sentuh (pan, zoom, tilt, rotate) yang mulus.
2. **Pelacakan Lokasi Pengguna Otomatis (Foreground GPS Tracking):**
   - Mendeteksi koordinat latitude/longitude pengguna saat ini secara akurat melalui GPS perangkat.
3. **Marker Pengguna dengan Pulse Indicator:**
   - Titik biru dengan animasi berkedip yang bergerak mengikuti pembaruan GPS pengguna.
4. **Marker Insiden/Laporan Tematik:**
   - Titik-titik laporan infrastruktur dan bencana dengan pin warna berbeda sesuai kategori dan tingkat keparahan.
5. **Perhitungan Jarak Haversine Realtime:**
   - Saat pengguna memilih salah satu laporan, sistem langsung menghitung jarak garis lurus dari lokasi pengguna ke titik laporan secara realtime.
6. **Kontrol Mode Tracking Adaptif (50m, 20m, 5m):**
   - Pengguna dapat memilih frekuensi pembaruan posisi berdasarkan kebutuhan (Battery Saver vs High Precision).
7. **Tombol "Lokasi Saya" (Smart Recenter):**
   - Kamera peta memusatkan kembali ke lokasi pengguna tanpa mengganggu pengguna saat sedang menjelajahi bagian peta lainnya.
8. **Graceful Fallback & Error Handling:**
   - Jika pengguna menolak izin lokasi atau GPS mati, peta tetap dapat dibuka untuk melihat data laporan simulasi, disertai banner edukasi yang jelas.

---

## 5. Hasil Pengujian & Verifikasi Kualitas Kode

Pengujian telah dijalankan secara langsung pada codebase:

### A. Pengujian Unit Geodesi Haversine (`scripts/test-haversine.mjs`)
Dijalankan via Node.js Test Runner:
```text
✔ isValidCoordinate: validates latitude and longitude ranges strictly (3.22ms)
✔ Haversine: same coordinates must yield exactly 0 meters (0.35ms)
✔ Haversine: two distinct coordinates yield positive, finite distance (1.68ms)
✔ Haversine: global distance calculation (antipodal & equator) (0.48ms)
✔ Haversine: invalid coordinates return null without crashing (0.35ms)
✔ formatDistance: formats correctly according to SDG 11 presentation guidelines (0.40ms)

ℹ tests 6 | pass 6 | fail 0 | duration_ms 25.6ms
```
**Hasil:** 6 dari 6 pengujian lulus 100%.

### B. Static Type Checking (`npx tsc --noEmit`)
```text
Command exited with code 0.
No output / 0 errors.
```
**Hasil:** Kontrak TypeScript 100% konsisten, tidak ada *type mismatches* atau `any` yang tidak aman.

### C. Linter Analisis Statis (`npx expo lint`)
```text
Command exited with code 0.
No errors, no warnings.
```
**Hasil:** Kode mengikuti kaidah penulisan React Native dan Clean Architecture.

---

## 6. Skenario & Langkah Live Demo di Hadapan Dosen

Berikut urutan langkah demonstrasi langsung saat presentasi:

### Skenario 1: Pembukaan Aplikasi & Permintaan Izin Lokasi
1. Buka aplikasi Civic Pulse pada perangkat Android atau simulator.
2. Tunjukkan dialog izin lokasi sistem Android (*"Allow Civic Pulse to access this device's location?"*).
3. **Penjelasan:** Jelaskan bahwa izin diminta secara *Just-In-Time* saat modul peta dibuka, bukan di awal instalasi tanpa konteks.

### Skenario 2: Peta Aktif & Auto-Centering Pertama Kali
1. Pilih **"While using the app"**.
2. Banner atas akan menampilkan status: *"Mencari sinyal GPS..."* lalu berubah menjadi *"Tracking Aktif (Akurasi: ±X m)"*.
3. Peta secara halus (*animated region*) memusatkan kamera ke posisi pengguna.
4. **Penjelasan:** Tunjukkan bahwa kamera hanya otomatis memusatkan **satu kali saja di awal** agar tidak merebut kendali kamera saat pengguna sedang mengeksplorasi peta.

### Skenario 3: Memilih Marker Laporan & Kalkulasi Jarak Haversine
1. Ketuk salah satu pin laporan merah di Jl. Raya Tlogomas (*"Jalan Berlubang Parah"*).
2. Tunjukkan *Selected Report Card* yang muncul meluncur di bagian bawah layar.
3. Sorot teks jarak di kartu: **"Jarak dari Anda: 188 m"** (atau jarak aktual dari lokasi dosen/mahasiswa).
4. **Penjelasan:** Jelaskan bahwa jarak ini dihitung seketika menggunakan rumus trigonometri bola Haversine tanpa memanggil API pihak ketiga yang berbayar.

### Skenario 4: Pengujian Tombol Recenter "Lokasi Saya"
1. Geser (*drag/pan*) peta menjauh ke arah luar kota atau perbesar (*zoom out*).
2. Tekan tombol ikon target bulat **"Lokasi Saya"** di kanan layar.
3. Kamera akan segera meluncur kembali dan memusatkan posisi pengguna.

### Skenario 5: Pengujian Mode Tracking Adaptif
1. Pada kontrol pemilih mode di kanan atas, tekan tombol **"5m"** (High Precision).
2. Tunjukkan banner status dan respon watcher yang diperbarui.
3. Ganti kembali ke **"20m"** (Balanced) atau **"50m"** (Low/Hemat Baterai).
4. **Penjelasan:** Jelaskan bahwa saat mode berganti, watcher lama langsung di-dispose (`subscription.remove()`) sehingga tidak ada duplikasi konsumsi baterai di latar belakang.

### Skenario 6: Demonstrasi Fallback (Jika Izin Ditolak)
1. Tunjukkan kondisi jika izin lokasi tidak diaktifkan:
   - Peta tetap terbuka menampilkan wilayah default Malang Raya.
   - Marker laporan insiden tetap dapat diklik.
   - Jarak pada kartu menampilkan teks: *"Menunggu lokasi..."* tanpa membuat aplikasi crash.
   - Banner atas menampilkan petunjuk ramah untuk mengaktifkan izin melalui pengaturan perangkat.

---

## 7. Skrip Pembagian Bicara Presentasi (Talking Points)

### Pembicara 1: Naufal (Lead System Architect & Security)
> *"Selamat pagi/siang Bapak/Ibu Dosen dan rekan-rekan. Pada Pertemuan 9 ini, proyek Civic Pulse berfokus pada Milestone 1: Pembangunan LBS dan Interactive Mapping Engine untuk pelaporan kerusakan infrastruktur kota dalam konteks SDG 11.*  
>  
> *Peran saya sebagai System Architect dan Security Engineer mencakup perancangan struktur clean architecture, pendefinisian kontrak data TypeScript yang ketat antara UI dan Hardware, penentuan mode tracking adaptif, serta pengawalan aspek keamanan data.*  
>  
> *Kami menerapkan prinsip Zero Location Persistence: posisi koordinat pengguna hanya diproses di memory selama layar aktif dan tidak pernah disimpan ke penyimpanan lokal maupun dicatat ke log demi melindungi privasi warga. Selanjutnya arsitektur UI peta akan dijelaskan oleh rekan saya, Syahril."*

---

### Pembicara 2: Syahril (Lead Frontend & Performance Specialist)
> *"Terima kasih Naufal. Di sisi antarmuka, saya merancang seluruh komponen presentasional pada modul peta ini.*  
>  
> *Kami membedakan marker pengguna dengan marker insiden secara visual: pengguna ditandai dengan pulse animation berwarna biru, sedangkan insiden diklasifikasikan menggunakan pin khusus berdasar kategori bencana seperti jalan rusak, banjir, atau lampu penerangan, lengkap dengan indikator warna tingkat keparahan.*  
>  
> *Untuk interaksi pengguna, saya membuat Selected Report Card di bagian bawah dengan transisi halus, tombol kontrol terapung dengan touch target minimal 44dp, serta status banner yang responsif terhadap safe area perangkat. Seluruh komponen dioptimasi menggunakan React.memo untuk menjamin rendering 60 FPS di perangkat Android. Selanjutnya sisi integrasi hardware dan kalkulasi spasial akan dijelaskan oleh Robi."*

---

### Pembicara 3: Robi (Lead Hardware & Spatial Math Engineer)
> *"Terima kasih Syahril. Fokus kontribusi saya adalah pada integrasi hardware perangkat melalui expo-location dan komputasi spasial.*  
>  
> *Saya mengimplementasikan custom hook `useLocationTracking` yang mengelola permission secara Just-In-Time dan menerapkan single active subscription lock menggunakan React ref. Ketika pengguna beralih antara mode interval 50m, 20m, atau 5m, subscription lama otomatis dihentikan sebelum membuat watcher baru sehingga konsumsi baterai tetap efisien.*  
>  
> *Selain itu, saya mengimplementasikan rumus Haversine murni dengan jari-jari bumi 6.371 km yang telah tervalidasi terhadap koordinat ekstrem dan antipodal melalui 6 unit test otomatis. Jarak yang dihasilkan kemudian diformat secara cerdas ke dalam satuan meter atau kilometer agar mudah dipahami oleh masyarakat."*

---

## 8. Antisipasi Tanya Jawab Dosen (Q&A Preparation)

**Q1: Mengapa menggunakan formula Haversine dan bukan Google Directions API untuk menghitung jarak?**  
*Jawaban (Robi / Naufal):*  
> *"Formula Haversine menghitung jarak garis lurus (great-circle distance) secara lokal di sisi client tanpa latensi jaringan dan tanpa biaya API pihak ketiga. Untuk tahap tanggap darurat dan triage bencana pada SDG 11, mengetahui radius kedekatan korban atau insiden secara instan sangat krusial. Integrasi rute jalan (turn-by-turn routing) dapat ditambahkan sebagai modul pelengkap di masa mendatang."*

**Q2: Bagaimana cara mencegah kebocoran memori (memory leak) dari location watcher saat screen ditutup?**  
*Jawaban (Robi):*  
> *"Di dalam `useLocationTracking`, kami menyimpan subscription ke dalam `useRef`. Pada fungsi cleanup `useEffect`, kami secara eksplisit memanggil `subscription.remove()`. Kami juga menggunakan flag `isMountedRef` untuk memastikan tidak ada pemanggilan `setState` yang tertinggal jika proses asinkron GPS baru selesai setelah komponen di-unmount."*

**Q3: Mengapa tidak menggunakan background location tracking?**  
*Jawaban (Naufal):*  
> *"Sesuai dengan batasan Milestone 1 dan prinsip privasi pengguna (Principle of Least Privilege), Civic Pulse hanya membutuhkan lokasi saat warga aktif membuka peta untuk melapor atau meninjau bencana di sekitarnya. Penggunaan foreground-only juga menghemat baterai perangkat secara signifikan."*

---

*Laporan ini disusun secara resmi untuk keperluan Presentasi Progres Pertemuan 9 — Tim Civic Pulse (Naufal, Syahril, Robi).*
