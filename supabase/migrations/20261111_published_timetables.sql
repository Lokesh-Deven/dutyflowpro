-- ==============================================================================
-- DUTYFLOW MIGRATION: Published Examination Timetables for Student Portal
-- File: supabase/migrations/20261111_published_timetables.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.published_timetables (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  institution_code TEXT,
  institution_name TEXT NOT NULL,
  examination_name TEXT NOT NULL,
  timetable_data JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_published_timetables_inst_id 
  ON public.published_timetables(institution_id);

CREATE INDEX IF NOT EXISTS idx_published_timetables_inst_code 
  ON public.published_timetables(institution_code);

-- Enable Row-Level Security
ALTER TABLE public.published_timetables ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including unauthenticated students) to view published timetables
DROP POLICY IF EXISTS "Public can view published timetables" ON public.published_timetables;
CREATE POLICY "Public can view published timetables"
  ON public.published_timetables
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated admins or anon to publish/update timetables
DROP POLICY IF EXISTS "Public can insert published timetables" ON public.published_timetables;
CREATE POLICY "Public can insert published timetables"
  ON public.published_timetables
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update published timetables" ON public.published_timetables;
CREATE POLICY "Public can update published timetables"
  ON public.published_timetables
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete published timetables" ON public.published_timetables;
CREATE POLICY "Public can delete published timetables"
  ON public.published_timetables
  FOR DELETE
  TO anon, authenticated
  USING (true);

