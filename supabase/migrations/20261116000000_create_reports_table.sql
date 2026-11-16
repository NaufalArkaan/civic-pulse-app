-- ============================================================
-- Civic Pulse (SDG 11) - Database Migration & RLS Security
-- Pertemuan 11: Real-Time Data Pipeline & Access Control
-- Role: Anggota 1 (Senior System Architect & Security Engineer)
-- ============================================================

-- 1. Enum Kategori dan Status Laporan
DO $$ BEGIN
  CREATE TYPE report_category_enum AS ENUM (
    'road-damage', 'flood', 'landslide', 'street-light'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status_enum AS ENUM (
    'submitted', 'verified', 'in_progress', 'resolved', 'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabel Laporan Warga
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category report_category_enum NOT NULL,
  status report_status_enum NOT NULL DEFAULT 'submitted',
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
  media_path TEXT,
  severity VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  is_simulation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ
);

-- Indeks untuk efisiensi kueri pencarian, filter, dan realtime
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON public.reports(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_coordinates ON public.reports(latitude, longitude);

-- 3. Trigger Otomatis Pembaruan `updated_at`
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reports_updated_at ON public.reports;
CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Aktifkan Supabase Realtime pada Tabel reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- 5. Row Level Security (RLS) Kebijakan Keamanan
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Kebijakan 1: Siapapun (publik/authenticated) dapat melihat laporan aktif (tidak di-soft-delete)
CREATE POLICY "Public Read Access for Active Reports"
  ON public.reports
  FOR SELECT
  USING (deleted_at IS NULL);

-- Kebijakan 2: Pengguna terautentikasi dapat membuat laporan atas ID miliknya sendiri dengan status 'submitted'
CREATE POLICY "Authenticated Users Can Insert Reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id AND
    status = 'submitted'
  );

-- Kebijakan 3: Pengguna dapat mengedit deskripsi laporannya sendiri selama belum diproses petugas
CREATE POLICY "Users Can Update Own Submitted Reports"
  ON public.reports
  FOR UPDATE
  USING (
    auth.uid() = reporter_id AND
    status = 'submitted'
  )
  WITH CHECK (
    auth.uid() = reporter_id AND
    status = 'submitted'
  );

-- Kebijakan 4: Hanya role petugas/admin yang dapat mengubah status (verified, in_progress, resolved)
-- Role ditentukan melalui custom claims auth.jwt() -> app_metadata -> role = 'official'
CREATE POLICY "Officials Can Update Report Status"
  ON public.reports
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('official', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('official', 'admin')
  );
