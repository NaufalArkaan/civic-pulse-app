-- ============================================================================
-- CIVIC PULSE & COMMUNITY DISASTER MANAGEMENT (SDG 11)
-- Migrasi: Supabase Storage Bucket & Public Access Policy untuk Foto Laporan
-- ============================================================================
-- Cara Penggunaan:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Jalankan skrip ini untuk memastikan bucket 'civic-reports-media' terdaftar
--    dan dapat diakses oleh semua perangkat secara konsisten.
-- ============================================================================

BEGIN;

-- 1. Daftarkan bucket storage publik untuk foto laporan bencana
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'civic-reports-media',
  'civic-reports-media',
  true,
  10485760, -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- 2. Policy: Izinkan pembacaan publik untuk semua foto laporan
DROP POLICY IF EXISTS "Public reports media are accessible by all" ON storage.objects;
CREATE POLICY "Public reports media are accessible by all"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'civic-reports-media');

-- 3. Policy: Izinkan warga dan petugas mengunggah foto laporan baru
DROP POLICY IF EXISTS "Anyone can upload disaster report media" ON storage.objects;
CREATE POLICY "Anyone can upload disaster report media"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'civic-reports-media');

-- 4. Policy: Izinkan pembaharuan berkas
DROP POLICY IF EXISTS "Authenticated users can update report media" ON storage.objects;
CREATE POLICY "Authenticated users can update report media"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'civic-reports-media');

COMMIT;
