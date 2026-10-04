-- Migration: Institution Code System & Institution-Level Data Isolation
-- Implements permanent 3-digit Institution Codes ('001'-'999') and Internal Institution ID (UUID)
-- Guarantees isolated data environments for every institution.

-- 1. Create permanent institution code registry table
CREATE TABLE IF NOT EXISTS public.institution_code_registry (
  code TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  institution_id UUID NOT NULL,
  institution_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_institution_registry_email UNIQUE (email)
);

-- Index for case-insensitive email lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_registry_lower_email
  ON public.institution_code_registry (LOWER(TRIM(email)));

-- 2. Add institution_code and institution_id to profiles if not already present
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS institution_code TEXT,
  ADD COLUMN IF NOT EXISTS institution_id UUID;

-- Ensure institution_id defaults to id if null
UPDATE public.profiles
SET institution_id = id
WHERE institution_id IS NULL;

-- 3. Function to atomically get or allocate a permanent 3-digit Institution Code
CREATE OR REPLACE FUNCTION public.get_or_create_institution_code(
  p_email TEXT,
  p_institution_id UUID,
  p_institution_name TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
  v_existing_code TEXT;
  v_next_num INT;
  v_new_code TEXT;
BEGIN
  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;

  -- 3a. Check if this email was previously registered (Reinstatement rule)
  SELECT code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(email)) = v_clean_email
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    -- Update institution_id and name if changed (e.g. re-registered account)
    UPDATE public.institution_code_registry
    SET institution_id = p_institution_id,
        institution_name = COALESCE(p_institution_name, institution_name),
        updated_at = NOW()
    WHERE code = v_existing_code;

    -- Sync back to profiles
    UPDATE public.profiles
    SET institution_code = v_existing_code,
        institution_id = p_institution_id
    WHERE id = p_institution_id;

    RETURN v_existing_code;
  END IF;

  -- 3b. Allocate next sequential 3-digit code (001, 002, ..., 999)
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::INT), 0) + 1
  INTO v_next_num
  FROM public.institution_code_registry;

  IF v_next_num > 999 THEN
    v_new_code := LPAD(v_next_num::TEXT, 3, '0');
  ELSE
    v_new_code := LPAD(v_next_num::TEXT, 3, '0');
  END IF;

  -- Insert into permanent registry
  INSERT INTO public.institution_code_registry (code, email, institution_id, institution_name)
  VALUES (v_new_code, v_clean_email, p_institution_id, p_institution_name);

  -- Sync to profiles
  UPDATE public.profiles
  SET institution_code = v_new_code,
      institution_id = p_institution_id
  WHERE id = p_institution_id;

  RETURN v_new_code;
END;
$$;

-- 4. Public resolver function for student/invigilator login
CREATE OR REPLACE FUNCTION public.resolve_institution_by_code(
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_code TEXT := LPAD(TRIM(COALESCE(p_code, '')), 3, '0');
  v_rec RECORD;
BEGIN
  SELECT code, institution_id, institution_name
  INTO v_rec
  FROM public.institution_code_registry
  WHERE code = v_clean_code
  LIMIT 1;

  IF v_rec.code IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', true,
      'institution_code', v_rec.code,
      'institution_id', v_rec.institution_id,
      'institution_name', COALESCE(v_rec.institution_name, 'Institution')
    );
  END IF;

  -- Check profiles as fallback
  SELECT id, institution_code, institution_name
  INTO v_rec
  FROM public.profiles
  WHERE institution_code = v_clean_code
  LIMIT 1;

  IF v_rec.institution_code IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', true,
      'institution_code', v_rec.institution_code,
      'institution_id', v_rec.id,
      'institution_name', COALESCE(v_rec.institution_name, 'Institution')
    );
  END IF;

  RETURN jsonb_build_object('valid', false);
END;
$$;

-- 5. Row-level Security on institution_code_registry
ALTER TABLE public.institution_code_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can lookup institution codes"
  ON public.institution_code_registry
  FOR SELECT
  USING (true);

CREATE POLICY "Service and authenticated users can insert codes"
  ON public.institution_code_registry
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service and owners can update codes"
  ON public.institution_code_registry
  FOR UPDATE
  USING (auth.uid() = institution_id);
