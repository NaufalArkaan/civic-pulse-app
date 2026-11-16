# Civic Pulse — Spesifikasi Teknis Pertemuan 10
## Milestone 2: Offline-First Architecture & Secure Storage Integration

**Mata Kuliah:** Pemrograman Mobile  
**Tema:** Civic Pulse & Community Disaster Management (SDG 11)  
**Milestone:** Pertemuan 10  
**Status:** Technical Specification — Implementation Baseline

---

## 1. Ringkasan

Civic Pulse merupakan aplikasi mobile untuk pelaporan kerusakan infrastruktur kota dan mitigasi bencana berbasis komunitas. Pada Pertemuan 9, tim membangun fondasi Location-Based Services (LBS), Interactive Mapping Engine, GPS foreground tracking, Custom Markers, dan perhitungan jarak Haversine.

Pada Pertemuan 10, pengembangan dilanjutkan dengan fondasi pengelolaan data lokal yang aman dan akses perangkat yang bertanggung jawab. Fokus milestone ini adalah:

1. Penyimpanan data sensitif berukuran kecil menggunakan `expo-secure-store`.
2. Pengelolaan file lokal pada direktori privat aplikasi menggunakan `expo-file-system`.
3. Runtime permission dengan pola Just-In-Time (JIT) untuk kamera, lokasi, dan akses berkas sesuai kebutuhan fitur.
4. Penanganan kondisi offline secara graceful untuk alur penyimpanan lokal.

Milestone ini harus terintegrasi dengan struktur dan fitur Pertemuan 9, bukan membuat aplikasi atau sistem navigasi baru.

## 2. Acuan dan Ketentuan

Mengacu pada Panduan Tugas Besar Pemrograman Mobile:

- **Sub-CPMK 8:** Mahasiswa mampu mengimplementasikan penyimpanan terenkripsi hardware-backed dan pengelolaan berkas lokal berbasis Scoped Storage.
- **Deliverable 1:** Integrasi `expo-secure-store` untuk enkripsi data sensitif (Token/NIK/Kredensial).
- **Deliverable 2:** Integrasi `expo-file-system` (`documentDirectory`) untuk penanganan dokumen/media sandbox.
- **Deliverable 3:** Penanganan Runtime Permissions (Kamera/Lokasi/Storage) berbasis alur Just-In-Time.

Panduan proyek juga menetapkan penggunaan React Native berbasis Expo SDK, TypeScript, Antigravity IDE, separation of concerns, dan Architect's Audit Protocol.

## 3. Tujuan dan Acceptance Criteria

### 3.1 Tujuan

1. Menyediakan service terpusat untuk menyimpan, membaca, memperbarui, dan menghapus data sensitif melalui SecureStore.
2. Menyediakan Document Vault lokal untuk menyimpan dan mengelola metadata serta file laporan di sandbox aplikasi.
3. Memisahkan metadata sensitif dari file media.
4. Meminta permission ketika pengguna menjalankan tindakan yang memerlukannya.
5. Menangani permission denied, unavailable, file missing, storage error, dan kondisi offline tanpa membuat aplikasi crash.
6. Mempertahankan fitur peta dan LBS dari Pertemuan 9.

### 3.2 Kriteria Keberhasilan

- [ ] `expo-secure-store` terpasang dengan versi kompatibel terhadap Expo SDK proyek.
- [ ] Tersedia service/helper SecureStore yang reusable dan tidak dipanggil langsung dari banyak komponen UI.
- [ ] Data sensitif contoh dapat disimpan, dibaca, diperbarui, dan dihapus.
- [ ] Data sensitif tidak disimpan dalam AsyncStorage, plain JSON, log, atau hardcoded source.
- [ ] `expo-file-system` digunakan untuk menyimpan file di direktori privat aplikasi sesuai API versi yang terpasang.
- [ ] Pengguna dapat menambahkan file/media demonstrasi ke Document Vault.
- [ ] Aplikasi dapat menampilkan daftar file, detail metadata, membuka/preview jika format didukung, dan menghapus file.
- [ ] File dan metadata memiliki identitas yang konsisten; file yang hilang ditangani.
- [ ] Permission diminta hanya ketika pengguna memulai tindakan yang memerlukannya.
- [ ] Penolakan permission tidak menyebabkan aplikasi crash dan tersedia jalur alternatif yang sesuai.
- [ ] Fitur peta/LBS Pertemuan 9 tetap berfungsi.
- [ ] Operasi file dan secure storage memiliki loading/error/success state.
- [ ] Aplikasi tidak mengklaim file sandbox terenkripsi jika enkripsi file tidak diterapkan.

## 4. Ruang Lingkup

### 4.1 Termasuk

- SecureStore service untuk data sensitif kecil.
- Document Vault berbasis app-private document directory.
- Penyimpanan metadata file.
- Impor/pemilihan dokumen atau media melalui mekanisme yang sesuai versi Expo.
- Permission kamera dan lokasi Just-In-Time.
- Permission file/media jika memang diperlukan oleh API/platform yang dipakai.
- Offline-friendly local operation: operasi simpan/baca/hapus lokal tidak bergantung pada jaringan.
- UI dasar untuk mengelola data dan dokumen lokal.

### 4.2 Tidak termasuk

- Sinkronisasi cloud/backend.
- Autentikasi produksi dan manajemen akun server.
- Upload laporan ke server.
- Enkripsi file media end-to-end atau enkripsi vault menyeluruh, kecuali diminta sebagai pengembangan tambahan dan dirancang secara eksplisit.
- Background location.
- Implementasi penuh kamera dengan watermark koordinat/waktu jika belum menjadi deliverable pertemuan ini.
- Geofencing dan RxJS pipeline.
- Penggantian arsitektur navigasi atau upgrade Expo SDK.

## 5. Prinsip Arsitektur Keamanan

### 5.1 Pemisahan Jenis Data

| Jenis data | Lokasi penyimpanan | Ketentuan |
|---|---|---|
| Token/kredensial/NIK (nilai sensitif kecil) | `expo-secure-store` | Disimpan melalui API SecureStore; jangan dicatat ke log |
| Foto/dokumen/media | App-private `documentDirectory` | Dikelola melalui FileSystem; bukan SecureStore |
| Metadata file non-rahasia | Repository metadata lokal yang sesuai kebutuhan | Simpan ID, nama, tipe, ukuran, tanggal, dan file URI relatif/terkelola |
| Status UI sementara | React state/store sesuai arsitektur proyek | Jangan jadikan state UI sebagai penyimpanan permanen |

**Catatan keamanan:** SecureStore menggunakan mekanisme keamanan platform (Android Keystore dan iOS Keychain). Jangan mengasumsikan setiap perangkat selalu menyediakan hardware-backed storage dengan tingkat jaminan yang identik. Jelaskan kemampuan dan batasan sesuai platform/perangkat.

SecureStore ditujukan untuk pasangan key-value berukuran kecil, bukan file foto/PDF atau data besar. Jangan menyimpan media dalam bentuk Base64 ke SecureStore.

### 5.2 Batas Keamanan FileSystem

`documentDirectory` adalah area privat aplikasi yang sesuai untuk menyimpan file milik aplikasi. Namun:

- App sandbox bukan sinonim enkripsi file.
- Jangan menyatakan file terenkripsi hanya karena disimpan di document directory.
- Jangan menyimpan file ke folder publik tanpa kebutuhan dan izin yang jelas.
- Hindari mengekspos URI/path privat ke log atau analytics.
- Validasi tipe, ukuran, dan nama file sebelum menyimpan.
- Gunakan nama internal yang aman/unik untuk menghindari path traversal dan benturan nama.
- Jangan mempercayai ekstensi file saja untuk menentukan konten.

Jika file sensitif perlu dienkripsi saat tersimpan, desain enkripsi file, pengelolaan kunci, integritas, dan pemulihan harus menjadi pekerjaan terpisah yang disetujui. Jangan membuat kriptografi sendiri.

## 6. Teknologi dan Kompatibilitas

| Area | Teknologi |
|---|---|
| Mobile framework | React Native + Expo SDK versi repository |
| Language | TypeScript |
| Secure data | `expo-secure-store` |
| File management | `expo-file-system` |
| Camera permission | API kamera yang sudah digunakan/akan digunakan proyek, misalnya `expo-camera` bila memang diperlukan |
| Location permission | `expo-location` yang sudah diintegrasikan pada Pertemuan 9 |
| Document/media picker | API Expo yang kompatibel dengan SDK proyek, bila dibutuhkan |
| UI state | Ikuti state management yang telah ada; jangan menambah library tanpa alasan |

**Aturan kompatibilitas:** audit `package.json`, lockfile, Expo SDK, dan dokumentasi API dari versi yang terpasang sebelum implementasi. Gunakan `npx expo install <package>` untuk dependency Expo. `expo-file-system` memiliki perubahan API antarversi; gunakan API yang cocok dengan versi proyek dan jangan mencampur API legacy dengan API baru dalam satu implementasi.

Jangan melakukan upgrade Expo SDK, React Native, router, atau package manager sebagai bagian milestone ini tanpa persetujuan tim.

## 7. Arsitektur dan Struktur Folder

Sesuaikan dengan struktur repository saat ini. Jangan membuat ulang routing yang telah berjalan.

Struktur konseptual yang disarankan:

```text
app/
  (tabs)/
    vault.tsx                  # Screen Document Vault (sesuaikan router)
components/
  vault/
    VaultHeader.tsx
    VaultFileList.tsx
    VaultFileItem.tsx
    VaultEmptyState.tsx
    VaultPermissionNotice.tsx
    VaultActionSheet.tsx
hooks/
  useDocumentVault.ts
  useRuntimePermissions.ts
services/
  secure/
    secureStorage.ts
  files/
    documentVault.ts
    fileMetadataRepository.ts
  permissions/
    permissionService.ts
types/
  vault.ts
  permissions.ts
utils/
  fileValidation.ts
  fileName.ts
```

Tanggung jawab:

- **Screen:** menghubungkan UI dengan hooks/services.
- **UI components:** presentasi dan interaksi; tidak memanggil native storage APIs langsung.
- **Secure storage service:** operasi SecureStore.
- **Document vault service:** operasi file system.
- **Metadata repository:** metadata dokumen dan relasinya dengan file.
- **Permission service/hook:** pemeriksaan dan permintaan permission saat aksi diperlukan.
- **Validation utilities:** validasi nama, tipe, ukuran, dan metadata.

## 8. SecureStore Service

### 8.1 Kebutuhan

Buat abstraksi service untuk:

- `setSensitiveItem(key, value)`
- `getSensitiveItem(key)`
- `deleteSensitiveItem(key)`
- `isSecureStoreAvailable()` atau pemeriksaan kemampuan yang sesuai API versi.

Nama fungsi dapat disesuaikan, tetapi seluruh aplikasi harus menggunakan satu service konsisten. Tangani error dan nilai null secara eksplisit.

### 8.2 Data Demonstrasi

Untuk demonstrasi akademik, gunakan data dummy yang jelas, misalnya:

- token simulasi;
- NIK dummy yang bukan milik orang nyata;
- kredensial demonstrasi.

Jangan meminta atau menggunakan NIK asli anggota kelompok. Jangan menyimpan password plaintext. Jika ada autentikasi nyata di masa depan, simpan token yang diperlukan dan gunakan alur autentikasi yang benar; jangan menyimpan password pengguna hanya untuk memudahkan login.

### 8.3 Aturan

- Gunakan key yang terstandarisasi dan memiliki namespace aplikasi.
- Jangan mencetak value sensitif ke console.
- Jangan menaruh secret dalam source code atau `.env` yang ikut dikomit.
- Jangan menyimpan file/media ke SecureStore.
- Tangani kegagalan SecureStore dan platform yang tidak mendukung fitur tertentu.
- Dokumentasikan kebijakan penghapusan data saat logout/reset akun.

## 9. Document Vault dan Scoped Storage

### 9.1 Fungsi Minimal

Document Vault menyediakan:

1. Inisialisasi direktori aplikasi jika belum tersedia.
2. Impor/pemilihan dokumen atau media.
3. Penyalinan file ke direktori privat aplikasi.
4. Penyimpanan metadata file.
5. Daftar file tersimpan.
6. Detail file.
7. Preview/open jika tipe file didukung perangkat.
8. Penghapusan file beserta metadata terkait.

### 9.2 Metadata Minimum

```ts
export type VaultFile = {
  id: string;
  displayName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  localUri: string;
  category: "photo" | "document" | "other";
};
```

Sesuaikan field dengan hasil API file picker/FileSystem. Jangan mengasumsikan semua provider memberi MIME type atau ukuran file.

### 9.3 Penyimpanan dan Konsistensi

- Gunakan satu direktori khusus aplikasi, misalnya subfolder `civic-pulse/vault/` di bawah document directory.
- Buat direktori secara idempotent (aman dipanggil lebih dari sekali).
- Gunakan ID internal/UUID atau nama file unik.
- Jangan menggunakan nama asli pengguna sebagai path tanpa sanitasi.
- Metadata harus dapat menunjuk file yang benar.
- Jika file tidak ditemukan, tandai sebagai missing dan tawarkan hapus metadata/perbaikan.
- Jika copy file berhasil tetapi simpan metadata gagal, lakukan rollback file atau tandai orphan agar dapat dibersihkan.
- Jika hapus file gagal, jangan menghapus metadata seolah-olah file sudah terhapus.
- Pertimbangkan ukuran file dan ruang penyimpanan; jangan memuat semua file ke memory.

### 9.4 Validasi File

- Batasi tipe file yang diterima sesuai kebutuhan demo (misalnya image/jpeg, image/png, PDF).
- Tetapkan batas ukuran file yang masuk akal dan dapat dikonfigurasi.
- Tolak nama/path yang tidak aman.
- Jangan menganggap MIME type dari picker selalu valid.
- Berikan pesan yang jelas ketika file tidak didukung atau terlalu besar.

## 10. Runtime Permissions — Just-In-Time

Permission diminta ketika pengguna memulai aksi yang membutuhkan akses, bukan saat aplikasi baru dibuka tanpa konteks.

### 10.1 Kamera

- Minta kamera ketika pengguna menekan aksi ambil foto.
- Jelaskan alasan penggunaan sebelum prompt OS jika sesuai kebutuhan UX.
- Jika ditolak, tampilkan pesan dan opsi membuka Settings bila statusnya permanently denied dan API/platform mendukung.
- Jangan meminta kamera ketika pengguna hanya membuka halaman Vault atau Map.

### 10.2 Lokasi

- Pertahankan alur lokasi dari Pertemuan 9.
- Minta foreground location ketika pengguna mengaktifkan fitur yang memerlukan lokasi, misalnya “Lokasi Saya” atau menambahkan koordinat laporan.
- Jangan meminta background location pada milestone ini.
- Jika ditolak, peta dan fungsi Vault yang tidak memerlukan lokasi tetap dapat digunakan.

### 10.3 Storage / Media / Document Access

- Utamakan system document picker atau media picker yang memberikan akses terpilih oleh pengguna.
- Jangan meminta broad storage permission jika API picker dan app-private directory tidak memerlukannya.
- Bedakan akses file yang dipilih pengguna dari akses seluruh media/perangkat.
- Periksa kebutuhan permission berdasarkan Android/iOS dan versi Expo yang digunakan.
- Jelaskan bahwa file hasil impor disalin ke direktori privat aplikasi bila itu perilaku implementasi.

### 10.4 Permission State

Tangani minimal:

- `not-requested`
- `granted`
- `denied`
- `restricted` atau `unavailable` bila platform/API mengembalikannya
- `needs-settings` bila pengguna perlu mengubah pengaturan perangkat

Nama state final mengikuti API platform yang digunakan. Jangan mengasumsikan semua platform mempunyai status identik.

## 11. Offline-First Behavior

Pada milestone ini, offline-first berarti operasi lokal berikut tetap berfungsi tanpa koneksi internet:

- membaca data SecureStore yang telah disimpan;
- menampilkan daftar metadata dokumen lokal;
- membuka/preview file lokal yang didukung;
- mengimpor file dari sumber lokal yang tersedia;
- menghapus file lokal dan metadata.

Jangan mengklaim sudah ada sinkronisasi offline/online, antrean upload, conflict resolution, atau backend sync. Hal tersebut di luar deliverable Pertemuan 10 kecuali diminta secara terpisah.

## 12. UI/UX States

Document Vault minimal memiliki:

- Loading saat membaca metadata/file.
- Empty state ketika belum ada dokumen.
- File list ketika dokumen tersedia.
- Importing state saat file disalin.
- Success feedback setelah operasi berhasil.
- Error state jika file gagal disalin/dibaca/dihapus.
- Permission explanation/denied state.
- Missing file state jika metadata menunjuk file yang tidak ada.
- Konfirmasi sebelum menghapus dokumen.
- Informasi bahwa file tersimpan secara lokal pada perangkat.

Jangan menampilkan nilai NIK/token lengkap. Jika perlu memperlihatkan data identitas pada demo, gunakan masking.

## 13. Pembagian Tugas

### Anggota 1 — Naufal
**Lead System Architect & Security Engineer**

- Audit arsitektur dan dependency proyek.
- Menentukan klasifikasi data: SecureStore, file sandbox, metadata, dan state sementara.
- Mengimplementasikan SecureStore service.
- Menentukan kontrak types dan API service.
- Menetapkan error handling, key naming, dan kebijakan data sensitif.
- Mengintegrasikan service ke alur aplikasi.
- Memimpin Architect's Audit Protocol dan review keamanan.

**Output:** SecureStore service, types/contract, integrasi, security checklist, audit.

### Anggota 2 — Syahril
**Lead Frontend & Performance Specialist**

- Membuat UI Document Vault.
- Membuat daftar dokumen, item file, empty/loading/error state, dan konfirmasi penghapusan.
- Membuat UX permission explanation dan feedback.
- Menghubungkan UI ke hooks/service melalui props/contract.
- Memastikan nilai sensitif dimasking dan tidak tampil di UI/log.
- Mengoptimalkan render secara terukur dan menjaga konsistensi desain aplikasi.

**Output:** Vault screens/components, permission UX, interaction states, UI integration.

### Anggota 3 — Robi
**Lead Hardware & Spatial/Network Engineer**

- Audit API `expo-file-system` sesuai versi Expo.
- Mengimplementasikan document directory, copy/read/delete file, dan metadata flow sesuai kontrak.
- Mengintegrasikan document/media picker atau camera permission jika diperlukan oleh alur demonstrasi.
- Mengimplementasikan permission service/hook JIT untuk kamera/lokasi/akses media yang relevan.
- Menangani kegagalan file, ukuran/tipe, URI, dan lifecycle operasi asinkron.
- Memastikan LBS Pertemuan 9 tetap berjalan dan permission lokasi tidak diminta tanpa konteks.

**Output:** Document Vault file service, permission integration, file validation, device testing.

### Aturan Kolaborasi

- Sepakati kontrak types dan API service sebelum coding paralel.
- Hindari mengedit file yang sama pada waktu bersamaan.
- Setiap anggota bekerja pada branch sendiri.
- Gunakan commit yang deskriptif dan pull request/merge review.
- Jangan menerima perubahan Antigravity yang menghapus atau menimpa pekerjaan anggota lain.

## 14. Urutan Implementasi

1. Audit repository, Expo SDK, package manager, dependency, dan hasil Pertemuan 9.
2. Tentukan klasifikasi data dan kontrak types/API.
3. Pasang `expo-secure-store` dan `expo-file-system` menggunakan versi kompatibel.
4. Implementasikan SecureStore service dan uji set/get/delete.
5. Implementasikan direktori Vault dan file operations.
6. Implementasikan metadata repository dan validasi file.
7. Implementasikan permission JIT untuk kamera/lokasi/file selection.
8. Implementasikan UI Document Vault dan permission states.
9. Integrasikan dengan aplikasi dan pastikan Map/LBS tetap berfungsi.
10. Uji alur offline, error, permission denied, dan file missing.
11. Jalankan typecheck/lint/test yang tersedia.
12. Lakukan Architect's Audit Protocol dan review commit.

## 15. Pengujian Minimum

### SecureStore

- Simpan nilai dummy, baca kembali, perbarui, dan hapus.
- Baca key yang belum tersedia.
- Tangani kegagalan operasi.
- Pastikan nilai sensitif tidak tercetak di log atau UI tanpa masking.
- Uji pada perangkat target; jangan mengasumsikan perilaku identik di semua platform.

### FileSystem / Vault

- Inisialisasi direktori berulang kali.
- Impor file dengan tipe/ukuran yang diizinkan.
- Tolak tipe/ukuran yang tidak diizinkan.
- Tampilkan daftar metadata.
- Buka/preview file yang didukung.
- Hapus file dan metadata.
- Tangani file hilang, copy gagal, metadata gagal, dan delete gagal.
- Uji operasi ketika perangkat offline.

### Permissions

- Permission belum diminta: prompt baru muncul setelah aksi.
- Permission granted: aksi dapat dilanjutkan.
- Permission denied: tampilkan fallback dan aplikasi tetap dapat digunakan.
- Permission kamera tidak diminta saat hanya membuka Map/Vault.
- Location permission dari Pertemuan 9 tetap dipanggil sesuai kebutuhan fitur lokasi.
- Document picker digunakan tanpa meminta akses storage luas jika tidak diperlukan.

## 16. Architect's Audit Protocol

### Check 1 — Explicit Error Handling & Permissions

- [ ] Permission diminta Just-In-Time.
- [ ] Denied/restricted/unavailable ditangani.
- [ ] SecureStore/FileSystem error ditangkap.
- [ ] UI memberi pesan yang dapat ditindaklanjuti.

### Check 2 — Graceful Fallbacks

- [ ] Aplikasi tetap bisa dibuka ketika permission ditolak.
- [ ] Vault menampilkan empty/error state dengan benar.
- [ ] File missing tidak menyebabkan crash.
- [ ] Operasi lokal tidak mensyaratkan koneksi internet.
- [ ] Peta/LBS tetap berfungsi.

### Check 3 — Data Protection & Resource Cleanup

- [ ] Token/NIK/kredensial tidak disimpan dalam plain storage.
- [ ] Tidak ada nilai sensitif di console/log.
- [ ] SecureStore tidak digunakan untuk media besar.
- [ ] Nama/path file divalidasi.
- [ ] Metadata dan file tetap konsisten.
- [ ] Operasi asinkron tidak memperbarui state setelah screen unmount.
- [ ] Tidak ada klaim enkripsi file tanpa implementasi enkripsi file.

## 17. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| API FileSystem berbeda antar Expo SDK | Audit versi dan gunakan API yang sesuai |
| SecureStore gagal/tidak tersedia | Error handling dan fallback yang tidak membocorkan data |
| Salah menyimpan media ke SecureStore | Pisahkan data kecil sensitif dan file media |
| Permission diminta terlalu awal | JIT permission berdasarkan aksi |
| Broad storage permission tidak diperlukan | Gunakan picker sistem dan app-private directory |
| Metadata tidak cocok dengan file | ID stabil, operasi terurut, rollback/orphan cleanup |
| File terlalu besar/tidak didukung | Validasi tipe/ukuran dan feedback |
| Menganggap sandbox berarti encrypted | Dokumentasikan batas keamanan secara eksplisit |
| Perubahan merusak fitur P9 | Regression test Map/LBS setelah integrasi |

## 18. Definition of Done

Pertemuan 10 selesai jika:

1. SecureStore service dapat menyimpan, membaca, dan menghapus data dummy sensitif.
2. Document Vault dapat mengimpor, menampilkan, dan menghapus file lokal.
3. File dikelola pada direktori privat aplikasi menggunakan API FileSystem yang sesuai versi.
4. Permission kamera/lokasi/file access diminta secara Just-In-Time.
5. Error, permission denied, file missing, dan offline state ditangani.
6. Tidak ada data sensitif yang tercetak di log atau disimpan di plain storage.
7. Fitur Map/LBS Pertemuan 9 tidak rusak.
8. Ketiga anggota mempunyai kontribusi kode yang dapat ditelusuri melalui Git commit.
9. Typecheck/lint/test yang tersedia dijalankan dan hasilnya dilaporkan secara jujur.

## 19. Di Luar Ruang Lingkup Pertemuan 10

- Sinkronisasi cloud dan upload antrean.
- Backend/authentication produksi.
- Geofencing area rawan bencana.
- RxJS debounce/filter pipeline.
- Background location.
- Realtime WebSocket/Firebase/Supabase.
- Enkripsi seluruh file vault kecuali dirancang sebagai fitur tambahan yang disetujui.
- Build final APK dan audit akhir proyek yang dijadwalkan pada milestone selanjutnya.
