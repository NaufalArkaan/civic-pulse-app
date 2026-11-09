# Civic Pulse --- Spesifikasi Teknis Pertemuan 9

## Milestone 1: Inisialisasi Modul LBS & Interactive Mapping Engine

**Mata Kuliah:** Pemrograman Mobile\
**Tema:** Civic Pulse & Community Disaster Management (SDG 11)\
**Milestone:** Pertemuan 9\
**Status dokumen:** Technical Specification --- Implementation Baseline

------------------------------------------------------------------------

## 1. Ringkasan Proyek

Civic Pulse adalah aplikasi mobile untuk membantu warga melaporkan
kerusakan infrastruktur kota dan memperoleh informasi lokasi yang
relevan terhadap mitigasi bencana berbasis komunitas.

Pada Pertemuan 9, tim membangun fondasi layanan berbasis lokasi
(*Location-Based Services/LBS*) dan mesin pemetaan interaktif. Hasil
milestone ini menjadi dasar bagi fitur laporan warga, geofencing area
rawan, dan pemetaan laporan pada pertemuan berikutnya.

**Batasan milestone:** implementasi hanya mencakup peta interaktif,
pengambilan lokasi perangkat, pelacakan lokasi selama layar digunakan,
marker contoh, dan kalkulasi jarak garis lurus. Belum mencakup backend,
autentikasi, unggah laporan, kamera/watermark, penyimpanan dokumen,
geofencing produksi, maupun RxJS.

## 2. Acuan dan Ketentuan

Dokumen ini mengikuti panduan tugas besar Pemrograman Mobile yang
diberikan dosen: - React Native berbasis Expo SDK. - `react-native-maps`
dan `expo-location` untuk LBS. - Pemisahan Custom Hooks, UI Screen, dan
fungsi utilitas. - Penanganan permission dan error secara eksplisit. -
Subscription/listener harus dibersihkan saat komponen dilepas
(*cleanup*). - Memperhatikan performa dan prinsip Architect's Audit
Protocol.

Pada panduan tugas besar, deliverable Pertemuan 9 adalah: 1. Konfigurasi
`react-native-maps` dan `expo-location`. 2. Custom Hook
`useLocationTracking` dengan `distanceInterval` adaptif. 3. Custom
Markers dan kalkulasi jarak lurus menggunakan formulasi Haversine.

## 3. Tujuan dan Kriteria Keberhasilan

### 3.1 Tujuan

1.  Menampilkan peta pada perangkat Android.
2.  Meminta izin lokasi secara tepat dan menjelaskan kondisi ketika izin
    ditolak.
3.  Mendapatkan lokasi terkini dan memperbaruinya melalui watcher ketika
    layar aktif.
4.  Memusatkan peta ke lokasi pengguna.
5.  Menampilkan marker lokasi pengguna dan beberapa titik laporan
    contoh.
6.  Menghitung jarak garis lurus antara lokasi pengguna dan titik
    laporan menggunakan Haversine.
7.  Menampilkan jarak dengan format yang mudah dibaca.

### 3.2 Acceptance Criteria

-   [ ] Aplikasi dapat dijalankan pada perangkat fisik Android.
-   [ ] Peta tampil tanpa menutupi status bar atau kontrol utama.
-   [ ] Permission lokasi diminta saat fitur lokasi digunakan, bukan
    tanpa konteks.
-   [ ] Jika permission ditolak, aplikasi tetap dapat menampilkan peta
    dan pesan yang sesuai.
-   [ ] Lokasi pengguna ditampilkan setelah koordinat berhasil
    diperoleh.
-   [ ] Lokasi diperbarui melalui `watchPositionAsync` selama
    layar/pelacakan aktif.
-   [ ] Subscription lokasi dihentikan saat hook/screen tidak lagi
    aktif.
-   [ ] `distanceInterval` dapat berubah berdasarkan mode tracking yang
    didefinisikan.
-   [ ] Marker laporan contoh dapat ditekan dan menampilkan ringkasan.
-   [ ] Jarak setiap laporan dihitung dengan Haversine, bukan perkiraan
    visual peta.
-   [ ] Loading, error, permission denied, dan GPS unavailable memiliki
    UI state yang jelas.
-   [ ] Tidak ada koordinat pengguna atau API key yang di-hardcode
    sebagai data pribadi.

## 4. Ruang Lingkup Fungsional

### 4.1 Map Screen

Halaman utama milestone menampilkan: - Peta interaktif. - Tombol "Lokasi
Saya" untuk memusatkan kamera ke koordinat terbaru. - Indikator status
lokasi: mencari lokasi, aktif, izin ditolak, atau gagal. - Marker posisi
pengguna. - Marker beberapa laporan infrastruktur contoh. - Panel/detail
ringkas ketika marker laporan dipilih. - Jarak dari pengguna ke laporan
terpilih.

### 4.2 Location Tracking

Custom Hook `useLocationTracking` bertanggung jawab untuk: - Memeriksa
dan meminta permission foreground location. - Mengambil lokasi awal. -
Memulai watcher lokasi. - Menyimpan koordinat terbaru dan status
tracking. - Menangani error. - Menghentikan watcher ketika tracking
dinonaktifkan atau hook dilepas.

Tracking pada milestone ini berjalan ketika aplikasi berada di
foreground dan screen yang menggunakan hook sedang aktif. Background
location tidak termasuk ruang lingkup.

### 4.3 Adaptive Distance Interval

Buat mode tracking yang eksplisit dan mudah diuji. Nilai awal yang
disarankan: - `low`: 50 meter. - `balanced`: 20 meter. - `high`: 5
meter.

Nilai tersebut adalah konfigurasi awal proyek, bukan standar universal.
Gunakan `distanceInterval` pada `Location.watchPositionAsync`. Jangan
mengubah konfigurasi watcher secara diam-diam; ketika mode berubah,
hentikan watcher lama lalu buat watcher baru dan pastikan hanya ada satu
subscription aktif.

Gunakan `accuracy` yang sesuai kebutuhan dan dokumentasikan trade-off
konsumsi baterai. Jangan mengklaim GPS selalu memberi akurasi tertentu.

## 5. Teknologi dan Batasan Implementasi

  -----------------------------------------------------------------------
  Area                                Teknologi
  ----------------------------------- -----------------------------------
  Mobile framework                    React Native + Expo SDK yang sudah
                                      dipakai repository

  Language                            TypeScript

  Map                                 `react-native-maps`

  Location                            `expo-location`

  Navigation                          Pertahankan router/navigation yang
                                      sudah ada

  State lokal                         React state di dalam hook/screen;
                                      jangan memperkenalkan state manager
                                      baru tanpa kebutuhan

  Testing                             Unit test fungsi Haversine jika
                                      test runner sudah tersedia
  -----------------------------------------------------------------------

**Penting:** sebelum instalasi, periksa `package.json`, Expo SDK, React
Native, dan package manager yang digunakan. Gunakan `npx expo install`
untuk dependency native yang kompatibel dengan Expo SDK proyek. Jangan
melakukan upgrade Expo SDK, React Native, atau router sebagai bagian
dari milestone ini kecuali memang wajib dan disetujui tim.

## 6. Arsitektur dan Struktur Folder

Sesuaikan dengan struktur repository yang sudah ada. Jangan memindahkan
atau mengganti routing yang telah berjalan. Struktur konseptual yang
disarankan:

``` text
app/
  (tabs)/
    map.tsx                  # Screen/route peta (sesuaikan router)
components/
  map/
    CivicMap.tsx             # Pembungkus MapView
    UserLocationMarker.tsx
    ReportMarker.tsx
    SelectedReportCard.tsx
    MapControls.tsx
hooks/
  useLocationTracking.ts
types/
  location.ts
  report.ts
utils/
  haversine.ts
  formatDistance.ts
constants/
  map.ts
  sampleReports.ts
```

Tanggung jawab: - **Screen:** menyusun UI dan menghubungkan hook dengan
komponen. - **Hook:** permission, current location, watcher, status,
cleanup. - **Utility:** kalkulasi Haversine dan format jarak; tidak
bergantung pada React. - **Map components:** presentasi MapView dan
marker. - **Types/constants:** kontrak data dan konfigurasi.

Hindari satu file besar yang mencampur permission, perhitungan jarak,
marker, dan seluruh UI.

## 7. Kontrak Data dan TypeScript

Gunakan tipe koordinat yang kompatibel dengan `react-native-maps` dan
`expo-location`, tetapi jangan mengikat seluruh domain ke tipe library
jika tidak diperlukan.

Contoh kontrak konseptual:

``` ts
export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type TrackingMode = "low" | "balanced" | "high";

export type LocationStatus =
  | "idle"
  | "requesting-permission"
  | "permission-denied"
  | "loading"
  | "tracking"
  | "error";

export type CivicReport = {
  id: string;
  title: string;
  category: "road-damage" | "flood" | "landslide" | "street-light";
  description: string;
  coordinate: Coordinate;
  createdAt: string;
  severity: "low" | "medium" | "high";
};
```

Data laporan untuk milestone ini berupa data statis/dummy yang diberi
label sebagai data demonstrasi. Jangan menampilkan data dummy
seolah-olah laporan warga sungguhan.

## 8. Spesifikasi Custom Hook `useLocationTracking`

### 8.1 Tanggung Jawab

Hook mengelola lifecycle lokasi dan menyediakan API sederhana kepada
screen. UI tidak boleh mengelola `LocationSubscription` secara langsung.

### 8.2 API yang Disarankan

``` ts
type UseLocationTrackingOptions = {
  enabled?: boolean;
  mode?: TrackingMode;
};

type UseLocationTrackingResult = {
  location: Coordinate | null;
  accuracy: number | null;
  status: LocationStatus;
  error: string | null;
  permissionGranted: boolean;
  refreshLocation: () => Promise<void>;
};
```

Nama/kontrak boleh disesuaikan selama seluruh anggota menyepakati satu
API sebelum implementasi paralel.

### 8.3 Alur

1.  Screen mengaktifkan hook.
2.  Hook meminta/mengecek foreground permission.
3.  Jika ditolak, set status `permission-denied`, berikan pesan, dan
    jangan memulai watcher.
4.  Jika diizinkan, ambil lokasi awal menggunakan API current position.
5.  Mulai `watchPositionAsync` dengan konfigurasi mode yang aktif.
6.  Setiap update valid memperbarui koordinat dan accuracy.
7.  Ketika `enabled` menjadi false, mode berubah, atau screen unmount,
    remove subscription lama.
8.  Tangani kegagalan API tanpa membuat aplikasi crash.

### 8.4 Aturan Lifecycle

-   Gunakan `useEffect` dengan dependency yang tepat.
-   Simpan subscription pada variabel lokal effect atau ref.
-   Cleanup harus memanggil `subscription.remove()`.
-   Cegah race condition ketika permission/current position selesai
    setelah screen sudah unmount.
-   Pastikan perubahan mode tidak menyebabkan watcher ganda.
-   Jangan meminta permission berulang pada setiap render.

## 9. Peta dan Custom Markers

### 9.1 MapView

-   Tampilkan `MapView` dengan region awal yang aman. Jika lokasi belum
    tersedia, gunakan fallback area demonstrasi yang jelas diberi label.
-   Setelah lokasi pengguna tersedia, pusatkan peta secara terkontrol
    menggunakan `animateToRegion` atau pendekatan camera yang sesuai.
-   Jangan memaksa kamera kembali ke pengguna setiap kali state lokasi
    berubah karena akan mengganggu interaksi pan/zoom.
-   Sediakan tombol "Lokasi Saya" untuk recenter secara eksplisit.

### 9.2 Marker

-   Marker pengguna memiliki tampilan berbeda dari marker laporan.
-   Marker laporan dibedakan berdasarkan kategori atau severity dengan
    legenda/label yang jelas.
-   Gunakan `key` stabil berdasarkan `report.id`.
-   `onPress` marker memilih laporan dan menampilkan kartu ringkas.
-   Hindari membuat komponen marker berat atau menghitung ulang data
    yang tidak berubah.

### 9.3 Sample Data

Sediakan minimal 3 laporan contoh dengan koordinat valid. Gunakan lokasi
demonstrasi yang tidak mengungkap lokasi pribadi anggota. Data harus
diberi penanda "Data Simulasi".

## 10. Formulasi Haversine

Gunakan Haversine untuk menghitung jarak garis lurus di permukaan bumi
antara dua koordinat latitude/longitude.

``` ts
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineDistance(
  pointA: Coordinate,
  pointB: Coordinate
): number {
  const earthRadiusMeters = 6_371_000;

  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(pointB.latitude - pointA.latitude);
  const deltaLon = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const boundedA = Math.min(1, Math.max(0, a));
  const centralAngle = 2 * Math.atan2(
    Math.sqrt(boundedA),
    Math.sqrt(1 - boundedA)
  );

  return earthRadiusMeters * centralAngle;
}
```

Validasi input: - Latitude berada pada rentang -90 sampai 90. -
Longitude berada pada rentang -180 sampai 180. - Koordinat bukan `NaN`
atau `Infinity`. - Jika lokasi pengguna belum tersedia, jangan
menghitung jarak; tampilkan "Menunggu lokasi". - Hasil adalah jarak
garis lurus, bukan jarak jalan/rute navigasi.

Format tampilan: - Di bawah 1.000 meter: misalnya `350 m`. - 1.000 meter
atau lebih: misalnya `1,25 km`. - Gunakan pembulatan yang konsisten dan
hindari angka desimal berlebihan.

## 11. UI States dan Error Handling

Minimal tangani kondisi berikut: - `idle`: belum mulai. -
`requesting-permission`: permission sedang diproses. -
`permission-denied`: izin tidak diberikan. - `loading`: sedang mengambil
posisi awal. - `tracking`: lokasi berhasil diperoleh dan watcher
aktif. - `error`: layanan lokasi gagal atau terjadi error.

Pesan harus ramah dan dapat ditindaklanjuti. Jika izin ditolak, peta
tetap dapat digunakan untuk melihat marker simulasi. Jangan membuat
aplikasi bergantung penuh pada GPS untuk sekadar menampilkan peta.

## 12. Pembagian Tugas dan Integrasi

### Anggota 1 --- Naufal

-   Audit repository dan dependensi sebelum perubahan.
-   Menetapkan struktur folder, TypeScript types, kontrak hook, dan
    kontrak data laporan.
-   Menentukan status/error contract dan aturan lifecycle subscription.
-   Mengintegrasikan hasil anggota 2 dan 3 ke screen utama.
-   Melakukan review permission, cleanup, validasi koordinat, dan audit
    arsitektur.

**Output:** struktur/kontrak arsitektur, types, integrasi akhir, dan
checklist audit.

### Anggota 2 --- Syahril

-   Membuat tampilan Map Screen dan komponen UI peta.
-   Membuat Custom Marker pengguna dan laporan.
-   Membuat selected report card, map controls,
    status/loading/empty/error UI.
-   Mengoptimalkan render dengan `React.memo`, `useMemo`, dan
    `useCallback` bila pengukuran/struktur menunjukkan manfaat.
-   Memastikan Safe Area, ukuran layar, kontras, dan interaksi mudah
    digunakan.

**Output:** komponen UI peta yang dapat menerima props sesuai kontrak
tim.

### Anggota 3 --- Robi

-   Mengintegrasikan `react-native-maps` dan `expo-location`.
-   Mengimplementasikan `useLocationTracking` sesuai kontrak bersama.
-   Menangani foreground permission, current position, watcher, adaptive
    `distanceInterval`, dan cleanup.
-   Membuat utilitas Haversine dan format jarak atau berkolaborasi
    dengan Anggota 1 sesuai pembagian file.
-   Menyediakan data/hasil lokasi yang dibutuhkan screen.

**Output:** LBS hook yang dapat digunakan screen, konfigurasi map, dan
spatial utility.

### Aturan Kolaborasi

-   Sepakati nama file, tipe data, props, dan API hook sebelum coding
    paralel.
-   Hindari dua anggota mengedit file yang sama secara bersamaan.
-   Setiap anggota membuat branch sendiri dan commit dengan pesan
    deskriptif.
-   Integrasikan melalui pull request/merge dan lakukan review silang.
-   Jangan menimpa perubahan anggota lain dengan generated code.

## 13. Urutan Implementasi

1.  Audit repository: package manager, Expo SDK, router, TypeScript,
    struktur folder.
2.  Buat branch dan sepakati kontrak types/API.
3.  Instal dependency yang kompatibel dengan Expo SDK proyek.
4.  Implementasikan utility Haversine dan uji kasus dasar.
5.  Implementasikan hook permission dan current position.
6.  Implementasikan watcher dan adaptive distance interval.
7.  Implementasikan MapView dan region fallback.
8.  Tambahkan marker pengguna dan marker laporan simulasi.
9.  Hubungkan selected marker dengan kartu detail dan jarak Haversine.
10. Tambahkan loading/error/permission-denied states.
11. Jalankan lint/typecheck/test yang tersedia.
12. Uji pada perangkat Android fisik dan lakukan audit cleanup.

## 14. Pengujian Minimum

### Haversine

-   Dua titik sama menghasilkan jarak mendekati 0.
-   Dua koordinat berbeda menghasilkan jarak positif.
-   Kasus lintang/bujur valid.
-   Input invalid ditolak atau ditangani secara eksplisit.

### Location Hook

-   Permission granted: posisi awal diperoleh dan watcher berjalan.
-   Permission denied: status berubah dan watcher tidak dibuat.
-   Tracking disabled/unmount: subscription dibersihkan.
-   Mode berubah: watcher lama dilepas sebelum watcher baru dibuat.
-   Error lokasi: aplikasi tidak crash dan UI menampilkan fallback.

### UI/Map

-   Map tetap tampil tanpa permission lokasi.
-   Marker laporan dapat dipilih.
-   Jarak tidak ditampilkan sebagai angka palsu ketika lokasi belum ada.
-   Tombol recenter berfungsi.
-   Interaksi peta tidak terus-menerus terganggu oleh update GPS.

## 15. Architect's Audit Protocol --- Checklist Pertemuan 9

### Check 1: Explicit Error Handling & Permissions

-   [ ] Permission diminta pada saat fitur lokasi digunakan.
-   [ ] Permission denied dan layanan lokasi nonaktif ditangani.
-   [ ] Error API ditangkap dan diterjemahkan menjadi UI state.
-   [ ] Tidak ada asumsi bahwa GPS selalu tersedia.

### Check 2: Graceful Fallbacks

-   [ ] Peta tetap dapat dibuka tanpa izin lokasi.
-   [ ] Ada initial/fallback region yang aman.
-   [ ] Marker simulasi tetap dapat ditinjau.
-   [ ] Jarak menunggu lokasi jika koordinat pengguna belum tersedia.

### Check 3: Unsubscribe & Cleanup

-   [ ] `LocationSubscription.remove()` dipanggil saat cleanup.
-   [ ] Tidak ada watcher ganda setelah mode berubah.
-   [ ] Async operation tidak memperbarui state setelah lifecycle
    berakhir.
-   [ ] Tidak ada listener/subscription yang tertinggal.

### Performance & Maintainability

-   [ ] Komponen dipisah berdasarkan tanggung jawab.
-   [ ] Marker memakai key stabil.
-   [ ] Tidak ada kalkulasi berat yang tidak perlu pada setiap render.
-   [ ] Optimasi memoization digunakan secara terukur, bukan sekadar
    dekorasi.

## 16. Risiko dan Keputusan Teknis

  -----------------------------------------------------------------------
  Risiko                              Mitigasi
  ----------------------------------- -----------------------------------
  Dependency tidak kompatibel dengan  Periksa versi proyek dan gunakan
  Expo SDK                            `npx expo install`

  Permission ditolak                  Tampilkan fallback map dan
                                      instruksi yang jelas

  GPS tidak tersedia/sinyal lemah     Tampilkan status dan tombol coba
                                      lagi

  Kamera peta bergerak terus          Recenter hanya saat awal atau
                                      ketika tombol ditekan

  Watcher ganda                       Cleanup sebelum membuat watcher
                                      baru

  Baterai boros                       Sediakan mode interval dan
                                      dokumentasikan trade-off

  Koordinat dummy dianggap nyata      Beri label "Data Simulasi"

  Merge conflict                      Kontrak API lebih dahulu, pembagian
                                      file, branch terpisah
  -----------------------------------------------------------------------

## 17. Definisi Selesai (Definition of Done)

Milestone dinyatakan selesai jika: 1. Ketiga deliverable resmi Pertemuan
9 telah diimplementasikan. 2. Aplikasi berjalan pada perangkat fisik
Android. 3. Peta menampilkan marker pengguna (jika permission tersedia)
dan marker laporan simulasi. 4. Haversine digunakan untuk menampilkan
jarak garis lurus. 5. Permission, error, fallback, dan cleanup telah
diuji. 6. TypeScript/lint/test yang tersedia tidak memiliki error baru
yang belum dijelaskan. 7. Setiap anggota memiliki kontribusi kode yang
dapat ditelusuri melalui commit. 8. README singkat menjelaskan cara
menjalankan dan menguji fitur LBS.

## 18. Di Luar Ruang Lingkup Pertemuan 9

Jangan implementasikan sebagai bagian milestone ini kecuali dosen
meminta: - `expo-secure-store` dan vault dokumen. - `expo-file-system`
untuk dokumen/media. - Kamera dan watermark koordinat/waktu. -
Geofencing area rawan bencana. - RxJS debounce/filter pipeline. -
WebSocket/Firebase/Supabase realtime. - Background location tracking. -
Backend/API laporan warga.

Fitur tersebut menjadi fondasi atau target milestone berikutnya sesuai
panduan tugas besar.
