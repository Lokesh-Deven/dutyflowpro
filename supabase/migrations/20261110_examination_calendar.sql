-- ==============================================================================
-- DUTYFLOW MIGRATION: Examination Calendar
-- File: supabase/migrations/20261110_examination_calendar.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.examination_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  institution_code TEXT,
  slot_number INT NOT NULL,
  exam_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  total_marks INT,
  date_type TEXT NOT NULL DEFAULT 'tentative' CHECK (date_type IN ('tentative', 'final')),
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'tentative_published', 'final_published')),
  tentative_start_date DATE,
  tentative_end_date DATE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_exam_calendar_inst_slot UNIQUE (institution_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_exam_calendar_inst_id 
  ON public.examination_calendar (institution_id);

CREATE INDEX IF NOT EXISTS idx_exam_calendar_inst_code 
  ON public.examination_calendar (institution_code);

CREATE INDEX IF NOT EXISTS idx_exam_calendar_status 
  ON public.examination_calendar (publication_status);

-- Enable Row Level Security
ALTER TABLE public.examination_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read examination calendar" ON public.examination_calendar;
CREATE POLICY "Public can read examination calendar" 
  ON public.examination_calendar 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public can insert examination calendar" ON public.examination_calendar;
CREATE POLICY "Public can insert examination calendar" 
  ON public.examination_calendar 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update examination calendar" ON public.examination_calendar;
CREATE POLICY "Public can update examination calendar" 
  ON public.examination_calendar 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete examination calendar" ON public.examination_calendar;
CREATE POLICY "Public can delete examination calendar" 
  ON public.examination_calendar 
  FOR DELETE 
  USING (true);

