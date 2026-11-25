# SPESIFIKASI TEKNIS — CIVIC PULSE
## Pertemuan 12: Milestone 4 — Advanced UI Polish, Animations & Responsiveness

**Sub-CPMK 10:** Mahasiswa mampu merancang antarmuka mobile yang responsif, inklusif, dan berkinerja tinggi.

**Deliverables**
1. Penyempurnaan tata letak Flexbox responsif (mendukung rotasi layar via `useWindowDimensions`).
2. Mikro-interaksi dan animasi performan tinggi menggunakan `react-native-reanimated`.
3. Penanganan `KeyboardAvoidingView`, `SafeAreaProvider`, dan *Skeleton Loaders*.

---

## 1. Konteks dan Tujuan

Civic Pulse & Community Disaster Management merupakan aplikasi mobile pelaporan kondisi lingkungan/infrastruktur dan informasi komunitas. Milestone ini meningkatkan kualitas pengalaman pengguna: layout beradaptasi dengan ukuran layar/orientasi, animasi memberikan feedback yang bermakna, serta screen tetap nyaman digunakan saat keyboard muncul, pada perangkat dengan notch, dan ketika data sedang dimuat.

Ini adalah **polishing dan peningkatan UX**, bukan redesign total. Navigasi, domain model, backend, autentikasi, peta, offline cache, outbox, dan fitur dari milestone sebelumnya harus dipertahankan.

## 2. Prinsip implementasi

- Audit repository sebelum coding.
- Gunakan komponen, theme, spacing, typography, dan pola navigasi yang sudah ada.
- Responsif bukan sekadar memperkecil ukuran: atur hierarki dan layout berdasarkan ruang tersedia.
- Gunakan `useWindowDimensions()` agar layout bereaksi pada rotasi/resizing.
- Gunakan Flexbox dengan constraint fleksibel; hindari hard-coded width/height yang rapuh.
- Reanimated hanya untuk micro-interaction yang memperkuat UX.
- Perhatikan aksesibilitas, text scaling, touch targets, kontras, screen reader, dan reduced motion jika didukung.
- Jangan upgrade SDK/dependency besar tanpa audit dan justifikasi.
- Jangan klaim pengujian yang belum dilakukan.

## 3. Audit awal wajib

Sebelum mengubah kode:
1. Baca `package.json`, lockfile, konfigurasi Expo, `app.json`/`app.config.*`, Babel, dan routing.
2. Identifikasi versi Expo SDK, React Native, Reanimated, Expo Router, dan library UI.
3. Audit screen utama, report list/detail/form, map, modal, search/filter, dan loading states.
4. Periksa `SafeAreaProvider` dan safe-area handling; hindari provider ganda.
5. Periksa konfigurasi Reanimated sesuai versi yang terpasang.
6. Periksa keyboard behavior pada form, search, login, dan multiline input.
7. Catat baseline issue visual/typecheck/lint/test.

Setelah audit, tentukan screen prioritas, rencana perubahan, dan risiko kompatibilitas.

## 4. Responsive Layout & Orientation

### 4.1 `useWindowDimensions`
Gunakan `useWindowDimensions()` pada komponen/layout yang membutuhkan adaptasi. Layout harus merespons portrait-landscape, tablet/layar lebar, dan perubahan ukuran jendela yang didukung. Hindari mengambil dimensi sekali saja saat mount untuk layout dinamis.

### 4.2 Aturan layout
- Gunakan Flexbox (`flex`, `flexDirection`, `flexWrap`, `alignItems`, `justifyContent`) secara konsisten.
- Terapkan container `maxWidth` pada konten yang terlalu lebar.
- Gunakan breakpoint seperlunya, dengan alasan desain yang jelas.
- Layar sempit: utamakan satu kolom, hierarki informasi, dan kontrol mudah dijangkau.
- Layar lebar/landscape: gunakan ruang tambahan secara terukur; dua kolom hanya bila cocok.
- Hindari horizontal overflow, clipping, atau kontrol bertumpuk.
- List, map panel, filter, form, card, dan button harus tetap usable saat orientasi berubah.
- Jangan mengunci orientasi tanpa kebutuhan produk yang jelas.

### 4.3 Konsistensi visual
Pertahankan spacing, typography, color tokens, radius, elevation, icon sizing, dan state komponen. Jika design tokens belum tersedia, buat perubahan minimal dan dokumentasikan.

## 5. Reanimated Micro-interactions

Gunakan `react-native-reanimated` untuk interaksi yang sesuai, seperti:
- press feedback pada button/card;
- expand/collapse filter atau panel;
- transisi state kecil;
- feedback sukses/gagal setelah operasi nyata;
- entrance animation ringan jika tidak mengganggu.

Persyaratan:
- Audit versi Reanimated dan konfigurasi build terlebih dahulu.
- Gunakan API shared values/animated styles sesuai versi yang terpasang.
- Animasi singkat, konsisten, dan tidak menghambat navigasi, input, atau submit.
- Hindari animasi berlebihan pada list/map dan jangan animasikan semua elemen.
- Tidak memindahkan business logic ke worklet.
- Pertimbangkan reduced motion jika API/platform proyek mendukung.
- Cleanup/lifecycle aman.

## 6. Keyboard Handling

Terapkan `KeyboardAvoidingView` secara selektif pada screen input:
- pilih `behavior` yang sesuai platform dan layout;
- `keyboardVerticalOffset` harus berdasarkan header/safe area, bukan nilai arbitrer;
- field aktif tetap terlihat;
- form panjang dapat scroll;
- tombol submit tidak tertutup;
- multiline input tetap nyaman;
- search tidak menyebabkan layout jumping berlebihan;
- hindari nested keyboard handling yang tidak diperlukan.

Uji Android dan iOS bila environment tersedia; dokumentasikan perbedaan.

## 7. Safe Areas & SafeAreaProvider

- Pastikan `SafeAreaProvider` berada di root yang tepat dan tidak duplikat.
- Gunakan API safe-area yang kompatibel dengan dependency aktual.
- Lindungi konten dari notch, status bar, dan home indicator.
- Hindari padding inset berulang.
- Tentukan screen edge-to-edge dan screen yang mengikuti inset.
- Pastikan header, tab, modal, form, dan konten konsisten.

## 8. Skeleton Loaders

Implementasikan skeleton untuk asynchronous loading yang tepat:
- skeleton meniru struktur konten final secara sederhana;
- placeholder shape konsisten dengan design system;
- tampilkan pada initial loading atau keadaan yang tepat;
- jangan mengganti seluruh screen dengan skeleton pada setiap refresh kecil;
- hindari shimmer berat/instance berlebihan;
- pertimbangkan reduced motion;
- skeleton tidak digunakan untuk empty atau error state;
- jika cache tersedia, prioritaskan cached content dengan indikator refreshing daripada skeleton full-screen.

## 9. Accessibility & Inclusivity

Periksa:
- touch targets yang cukup;
- accessibility labels, roles, hints;
- kontras dan indikator status yang tidak hanya berbasis warna;
- text scaling tanpa clipping;
- screen reader order/focus;
- animasi tidak menghalangi interaksi;
- label form dan error yang jelas.

Jangan klaim audit WCAG penuh jika tidak dilakukan.

## 10. Integrasi Milestone Sebelumnya

Jangan merusak:
- Expo Router dan navigasi;
- auth dan SecureStore;
- FileSystem/Vault;
- SQLite cache/outbox/background sync;
- RxJS search/filter dan realtime;
- map, custom marker, location tracking;
- offline indicators dan reconciliation.

UI polishing tidak boleh mengubah business rules, model data, atau permission tanpa alasan dan persetujuan.

## 11. Pembagian Tanggung Jawab

**Naufal — Architect/Security:** audit arsitektur, review dependency/configuration, safe-area integration, batas UI/service, regression dan security review.

**Syahril — Frontend/Performance:** responsive layout, Reanimated micro-interactions, keyboard handling, safe-area UI, skeleton/empty/error states, accessibility, rendering performance.

**Robi — Device/Network/Platform:** pengujian device/orientation/platform, validasi perbedaan perangkat, bantu triage issue platform, regression pada network/offline/lifecycle.

## 12. Urutan Pengerjaan

1. Audit repository dan baseline.
2. Tentukan screen prioritas.
3. Tetapkan responsive rules/design tokens minimal.
4. Review safe-area root/inset.
5. Perbaiki keyboard behavior pada form/search.
6. Tambahkan micro-interactions dengan Reanimated.
7. Tambahkan skeleton loader dan state empty/error.
8. Uji portrait/landscape, layar kecil/lebar, text scaling.
9. Jalankan typecheck/lint/test/build yang tersedia.
10. Review regresi bersama tim.

## 13. Test Plan Minimum

- Portrait pada layar kecil.
- Landscape/rotasi dan kembali ke portrait.
- Ukuran layar lebar/tablet jika tersedia.
- Text scaling besar.
- Tidak ada overflow/clipping.
- Keyboard pada form pendek dan panjang.
- Submit tetap terlihat/terakses.
- Safe-area notch/status bar/home indicator.
- Press/expand animations halus dan tidak menghambat.
- Reduced motion jika didukung.
- Skeleton initial loading.
- Cache tersedia saat refresh: data tetap tampil.
- Empty/error tidak salah menampilkan skeleton.
- Realtime/offline tetap bekerja setelah polish.
- Regression fitur milestone sebelumnya.

## 14. Definition of Done

- Layout responsif menggunakan `useWindowDimensions` di kebutuhan yang tepat.
- Flexbox adaptif tanpa ukuran statis rapuh.
- Reanimated digunakan secara purpose-driven.
- Keyboard handling berfungsi pada screen input.
- Safe-area provider/inset tidak duplikatif.
- Skeleton ringan dan konsisten; empty/error terpisah.
- Accessibility basics diperiksa.
- Typecheck/lint/test relevan lulus atau kendala dicatat.
- Tidak ada regresi fitur lama.

## 15. Laporan Akhir

Laporkan hasil audit, screen prioritas, file yang diubah, responsive rules, animasi dan alasan, keyboard/safe-area, skeleton/empty/error, accessibility/performance checks, test results (platform/device), serta issue yang belum selesai.

**Prinsip utama:** setiap polish harus meningkatkan kejelasan, kenyamanan, aksesibilitas, atau performa. Jangan menambah animasi atau kompleksitas tanpa manfaat nyata.
