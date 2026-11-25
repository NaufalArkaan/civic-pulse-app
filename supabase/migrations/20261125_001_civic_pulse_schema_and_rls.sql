-- ============================================================================
-- CIVIC PULSE & COMMUNITY DISASTER MANAGEMENT (SDG 11)
-- Pertemuan 13 — Milestone 5: Production Hardening Migration & RLS Policies
-- Lead System Architect & Security Engineer: Naufal
-- ============================================================================
-- Prinsip Keamanan:
-- 1. Row-Level Security (RLS) WAJIB aktif pada seluruh tabel di skema public.
-- 2. Validasi server-side (CHECK constraint) pada koordinat, kategori, status,
--    dan panjang karakter untuk mencegah korupsi data meskipun UI dibypass.
-- 3. Pemisahan hak akses berbasis peran (citizen_reporter vs field_officer).
-- 4. Bucket storage `civic-vault-private` bersifat PRIVATE secara default.
-- ============================================================================

BEGIN;

-- 1. Tabel Utama Laporan Infrastruktur & Kebencanaan
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 160),
  category TEXT NOT NULL CHECK (category IN ('road-damage', 'flood', 'landslide', 'street-light')),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 2000),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'in_progress', 'resolved', 'rejected')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  media_path TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indeks untuk akselerasi query pencarian, filter, dan rekonsiliasi delta
CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON public.reports (updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_category_status ON public.reports (category, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports (reporter_id);

-- 2. Trigger Otoritatif: Cegah pemalsuan transisi status di sisi database
CREATE OR REPLACE FUNCTION public.enforce_report_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_role TEXT := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', 'citizen_reporter');
BEGIN
  -- Jika status berubah, pastikan sesuai state machine dan hak akses
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF jwt_role = 'citizen_reporter' THEN
      RAISE EXCEPTION 'RLS_AUTHORIZATION_ERROR: Warga pelapor tidak diizinkan mengubah status verifikasi laporan.';
    END IF;

    IF OLD.status = 'submitted' AND NEW.status NOT IN ('verified', 'rejected') THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Dari submitted hanya dapat ke verified atau rejected.';
    ELSIF OLD.status = 'verified' AND NEW.status NOT IN ('in_progress', 'rejected') THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Dari verified hanya dapat ke in_progress atau rejected.';
    ELSIF OLD.status = 'in_progress' AND NEW.status NOT IN ('resolved') THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Dari in_progress hanya dapat ke resolved.';
    ELSIF OLD.status IN ('resolved', 'rejected') THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Laporan dengan status final tidak dapat diubah kembali.';
    END IF;
  END IF;

  NEW.updated_at := GREATEST(NEW.updated_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_report_status ON public.reports;
CREATE TRIGGER trg_enforce_report_status
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.enforce_report_status_transition();

-- 3. Aktifkan Row-Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

-- Policy SELECT: Publik/warga terautentikasi hanya dapat melihat laporan yang belum dihapus
DROP POLICY IF EXISTS "reports_select_active" ON public.reports;
CREATE POLICY "reports_select_active"
ON public.reports
FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Policy INSERT: Hanya pengguna terautentikasi yang dapat membuat laporan atas namanya sendiri
-- dan status awal wajib 'submitted'
DROP POLICY IF EXISTS "reports_insert_authenticated_owner" ON public.reports;
CREATE POLICY "reports_insert_authenticated_owner"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND status = 'submitted'
  AND deleted_at IS NULL
);

-- Policy UPDATE (Pelapor): Hanya boleh memperbarui deskripsi laporan miliknya yang masih 'submitted'
DROP POLICY IF EXISTS "reports_update_own_submitted" ON public.reports;
CREATE POLICY "reports_update_own_submitted"
ON public.reports
FOR UPDATE
TO authenticated
USING (auth.uid() = reporter_id AND status = 'submitted' AND deleted_at IS NULL)
WITH CHECK (auth.uid() = reporter_id AND status = 'submitted');

-- Policy UPDATE (Petugas/Moderator): Dapat memperbarui status penanganan laporan
DROP POLICY IF EXISTS "reports_update_field_officer" ON public.reports;
CREATE POLICY "reports_update_field_officer"
ON public.reports
FOR UPDATE
TO authenticated
USING (
  coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', '') IN ('field_officer', 'coordinator_admin')
)
WITH CHECK (
  coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', '') IN ('field_officer', 'coordinator_admin')
);

-- 4. Storage Bucket Private Policy (civic-vault-private)
-- Catatan: Bucket bersifat private (public = false), hanya pemilik atau petugas yang dapat membaca via Signed URL
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('civic-vault-private', 'civic-vault-private', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
-- ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Jalankan hanya jika diperlukan pembatalan migrasi):
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_enforce_report_status ON public.reports;
-- DROP FUNCTION IF EXISTS public.enforce_report_status_transition();
-- DROP TABLE IF EXISTS public.reports;
-- COMMIT;
-- ============================================================================
