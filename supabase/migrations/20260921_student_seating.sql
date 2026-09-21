-- Migration: Student Seating Allocation Module for DutyFlow
-- Extends DutyFlow with self-contained rooms, subjects, students, and seating allocations

-- 1. Student Seating Master Rooms
CREATE TABLE IF NOT EXISTS public.student_seating_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_no TEXT NOT NULL,
  left_benches INT NOT NULL DEFAULT 10,
  right_benches INT NOT NULL DEFAULT 10,
  total_benches INT GENERATED ALWAYS AS (left_benches + right_benches) STORED,
  capacity_one INT GENERATED ALWAYS AS (left_benches + right_benches) STORED,
  capacity_two INT GENERATED ALWAYS AS ((left_benches + right_benches) * 2) STORED,
  capacity_three INT GENERATED ALWAYS AS ((left_benches + right_benches) * 3) STORED,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_student_room_user_no UNIQUE(user_id, room_no)
);

-- 2. Student Subjects
CREATE TABLE IF NOT EXISTS public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  expected_students INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Student Records
CREATE TABLE IF NOT EXISTS public.student_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_student_roll_per_subject UNIQUE(user_id, subject_id, roll_no)
);

-- 4. Student Seating Allocations
CREATE TABLE IF NOT EXISTS public.student_seating_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  examination JSONB NOT NULL,
  subject_ids JSONB NOT NULL,
  pattern TEXT NOT NULL,
  position_mapping JSONB NOT NULL,
  room_ids JSONB NOT NULL,
  room_plans JSONB NOT NULL,
  subject_stats JSONB NOT NULL,
  summary JSONB NOT NULL,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level Security
ALTER TABLE public.student_seating_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_seating_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own seating rooms"
  ON public.student_seating_rooms
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own student subjects"
  ON public.student_subjects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own student records"
  ON public.student_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own seating allocations"
  ON public.student_seating_allocations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
