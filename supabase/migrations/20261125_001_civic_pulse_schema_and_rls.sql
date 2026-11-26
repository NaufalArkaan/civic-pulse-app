-- ============================================================================
-- CIVIC PULSE & COMMUNITY DISASTER MANAGEMENT (SDG 11)
-- Pertemuan 13 — Milestone 5: Production Hardening Migration, RLS & Seed Data
-- Lead System Architect & Security Engineer: Naufal
-- ============================================================================
-- Cara Penggunaan:
-- 1. Buka Supabase Dashboard -> pilih Project Anda -> buka menu "SQL Editor".
-- 2. Klik "New Query", tempel (paste) seluruh isi file ini, lalu klik "Run".
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

-- 2. Trigger Otoritatif: Validasi State Machine Transisi Status & Otorisasi Peran
CREATE OR REPLACE FUNCTION public.enforce_report_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_role TEXT := coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
    'field_officer'
  );
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

-- Policy SELECT: Publik/warga hanya dapat melihat laporan yang belum dihapus (soft-delete filter)
DROP POLICY IF EXISTS "reports_select_active" ON public.reports;
CREATE POLICY "reports_select_active"
ON public.reports
FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Policy INSERT: Laporan baru wajib berstatus awal 'submitted' dan jika login wajib sesuai auth.uid()
DROP POLICY IF EXISTS "reports_insert_owner_or_client" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_authenticated_owner" ON public.reports;
CREATE POLICY "reports_insert_owner_or_client"
ON public.reports
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL OR reporter_id IS NULL OR auth.uid() = reporter_id)
  AND status = 'submitted'
  AND deleted_at IS NULL
);

-- Policy UPDATE: Pembaruan laporan divalidasi oleh trigger state machine & role claim
DROP POLICY IF EXISTS "reports_update_own_submitted" ON public.reports;
DROP POLICY IF EXISTS "reports_update_field_officer" ON public.reports;
DROP POLICY IF EXISTS "reports_update_authorized" ON public.reports;
CREATE POLICY "reports_update_authorized"
ON public.reports
FOR UPDATE
TO anon, authenticated
USING (deleted_at IS NULL)
WITH CHECK (
  coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', 'field_officer')
  IN ('field_officer', 'coordinator_admin')
  OR (auth.uid() = reporter_id AND status = 'submitted')
);

-- 4. Seed Data Awal (5 Laporan Infrastruktur & Mitigasi Bencana Malang Raya / UMM)
INSERT INTO public.reports (
  id, title, category, description, status, severity, latitude, longitude, created_at, updated_at
) VALUES
  (
    'rep-malang-001',
    'Jalan Berlubang & Aspal Mengelupas di Jl. Raya Tlogomas',
    'road-damage',
    'Terdapat lubang sedalam 15cm dengan diameter sekitar 80cm di lajur kiri arah Kampus III UMM yang membahayakan pengendara roda dua saat hujan.',
    'submitted',
    'high',
    -7.9225,
    112.5982,
    now() - interval '2 hours',
    now() - interval '2 hours'
  ),
  (
    'rep-malang-002',
    'Genangan Banjir & Drainase Tersumbat di Kawasan Soekarno-Hatta',
    'flood',
    'Saluran drainase tersumbat sampah menyebabkan genangan air setinggi 35cm di badan jalan setelah hujan deras selama 45 menit.',
    'verified',
    'high',
    -7.9467,
    112.6158,
    now() - interval '4 hours',
    now() - interval '1 hour'
  ),
  (
    'rep-malang-003',
    'Retakan Tebing & Potensi Longsor di Bantaran Sungai Brantas Tegalgondo',
    'landslide',
    'Terdeteksi pergeseran tanah dan retakan sepanjang 4 meter pada talud penahan tanah dekat permukiman warga.',
    'in_progress',
    'high',
    -7.9188,
    112.5945,
    now() - interval '1 day',
    now() - interval '30 minutes'
  ),
  (
    'rep-malang-004',
    'Lampu Penerangan Jalan Umum (PJU) Padam di Jembatan Tunggulmas',
    'street-light',
    'Sebanyak 4 titik lampu PJU padam total sejak kemarin malam sehingga jarak pandang pengendara sangat terbatas dan rawan kecelakaan.',
    'submitted',
    'medium',
    -7.9295,
    112.6038,
    now() - interval '6 hours',
    now() - interval '6 hours'
  ),
  (
    'rep-malang-005',
    'Perbaikan Penutup Gorong-Gorong Amblas di Jl. Karyawiguna',
    'road-damage',
    'Penutup beton gorong-gorong yang sempat amblas telah selesai diganti dan diratakan kembali oleh tim dinas pekerjaan umum.',
    'resolved',
    'low',
    -7.9162,
    112.5971,
    now() - interval '2 days',
    now() - interval '3 hours'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
