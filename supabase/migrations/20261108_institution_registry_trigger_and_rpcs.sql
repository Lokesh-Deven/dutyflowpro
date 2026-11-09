-- ==============================================================================
-- Migration: Complete Supabase Institution Code Automation & RPC Functions
-- ==============================================================================

-- 1. Ensure Table Structure & Columns
CREATE TABLE IF NOT EXISTS public.institution_code_registry (
  institution_code TEXT PRIMARY KEY CHECK (institution_code ~ '^[0-9]{3}$'),
  institution_name TEXT NOT NULL CHECK (char_length(trim(institution_name)) > 0),
  institution_email TEXT NOT NULL,
  institution_id UUID NOT NULL,
  code TEXT GENERATED ALWAYS AS (institution_code) STORED,
  email TEXT GENERATED ALWAYS AS (institution_email) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_institution_code_registry_email UNIQUE (institution_email)
);

-- Case-insensitive index for email lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_registry_email_lower
  ON public.institution_code_registry (LOWER(TRIM(institution_email)));

-- Index on institution_id for relational filtering
CREATE INDEX IF NOT EXISTS idx_institution_registry_institution_id
  ON public.institution_code_registry (institution_id);

-- Ensure profiles has columns
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS institution_code TEXT,
  ADD COLUMN IF NOT EXISTS institution_id UUID;

-- 2. Configure Row-Level Security (RLS) on institution_code_registry
ALTER TABLE public.institution_code_registry ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for student & invigilator portal logins)
DROP POLICY IF EXISTS "Public can lookup institution codes" ON public.institution_code_registry;
CREATE POLICY "Public can lookup institution codes"
  ON public.institution_code_registry
  FOR SELECT
  USING (true);

-- Allow signup operations (anon, authenticated, service_role) to insert registry rows
DROP POLICY IF EXISTS "Authenticated users can insert institution codes" ON public.institution_code_registry;
DROP POLICY IF EXISTS "Allow insert into institution_code_registry" ON public.institution_code_registry;
CREATE POLICY "Allow insert into institution_code_registry"
  ON public.institution_code_registry
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (true);

-- Allow institution owners to update their record
DROP POLICY IF EXISTS "Owners can update their institution record" ON public.institution_code_registry;
CREATE POLICY "Owners can update their institution record"
  ON public.institution_code_registry
  FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = institution_id);

-- 3. Database Function: Atomically get or allocate a permanent 3-digit Institution Code
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
  v_clean_name TEXT := COALESCE(NULLIF(TRIM(p_institution_name), ''), 'Institution');
  v_existing_code TEXT;
  v_next_num INT;
  v_new_code TEXT;
BEGIN
  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;

  -- Check if this email was previously registered (Reinstatement rule)
  SELECT institution_code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_clean_email
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    -- Update institution_id and name if re-registered or changed
    UPDATE public.institution_code_registry
    SET institution_id = p_institution_id,
        institution_name = COALESCE(v_clean_name, institution_name),
        updated_at = NOW()
    WHERE institution_code = v_existing_code;

    -- Sync back to profiles
    UPDATE public.profiles
    SET institution_code = v_existing_code,
        institution_id = p_institution_id
    WHERE id = p_institution_id;

    RETURN v_existing_code;
  END IF;

  -- Allocate next sequential 3-digit code (001, 002, ..., 999)
  SELECT COALESCE(MAX(NULLIF(regexp_replace(institution_code, '\D', '', 'g'), '')::INT), 0) + 1
  INTO v_next_num
  FROM public.institution_code_registry;

  v_new_code := LPAD(v_next_num::TEXT, 3, '0');

  -- Insert into permanent registry
  INSERT INTO public.institution_code_registry (
    institution_code,
    institution_name,
    institution_email,
    institution_id
  ) VALUES (
    v_new_code,
    v_clean_name,
    v_clean_email,
    p_institution_id
  )
  ON CONFLICT (institution_email) DO NOTHING;

  -- Sync to profiles
  UPDATE public.profiles
  SET institution_code = v_new_code,
      institution_id = p_institution_id
  WHERE id = p_institution_id;

  RETURN v_new_code;
END;
$$;

-- 4. Database Function: Resolve institution by 3-digit code for logins
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
  SELECT institution_code, institution_id, institution_name, institution_email
  INTO v_rec
  FROM public.institution_code_registry
  WHERE institution_code = v_clean_code
  LIMIT 1;

  IF v_rec.institution_code IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', true,
      'institution_code', v_rec.institution_code,
      'institution_id', v_rec.institution_id,
      'institution_name', COALESCE(v_rec.institution_name, 'Institution'),
      'institution_email', v_rec.institution_email
    );
  END IF;

  -- Fallback to profiles table
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

-- 5. Automatic Auth Trigger: Automatically registers new signups into institution_code_registry
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(COALESCE(NEW.email, '')));
  v_inst_name TEXT := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'institution_name'), ''), 'Institution');
  v_code TEXT;
  v_next_num INT;
BEGIN
  IF v_email = '' THEN
    RETURN NEW;
  END IF;

  -- Check if this email was previously registered (Reinstatement rule)
  SELECT institution_code INTO v_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_email
  LIMIT 1;

  IF v_code IS NOT NULL THEN
    UPDATE public.institution_code_registry
    SET institution_id = NEW.id,
        institution_name = COALESCE(v_inst_name, institution_name),
        updated_at = NOW()
    WHERE institution_code = v_code;
  ELSE
    SELECT COALESCE(MAX(NULLIF(regexp_replace(institution_code, '\D', '', 'g'), '')::INT), 0) + 1
    INTO v_next_num
    FROM public.institution_code_registry;

    v_code := LPAD(v_next_num::TEXT, 3, '0');

    INSERT INTO public.institution_code_registry (
      institution_code,
      institution_name,
      institution_email,
      institution_id
    ) VALUES (
      v_code,
      v_inst_name,
      v_email,
      NEW.id
    )
    ON CONFLICT (institution_email) DO NOTHING;
  END IF;

  -- Ensure profile row exists
  INSERT INTO public.profiles (
    id,
    institution_id,
    institution_code,
    email,
    institution_name,
    subscription_status,
    download_count
  ) VALUES (
    NEW.id,
    NEW.id,
    v_code,
    v_email,
    v_inst_name,
    'Free Access',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    institution_code = EXCLUDED.institution_code,
    institution_id = EXCLUDED.institution_id,
    institution_name = COALESCE(NULLIF(EXCLUDED.institution_name, 'Institution'), profiles.institution_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. Instant Backfill: Automatically create registry rows for existing accounts
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  v_next_num INT;
  v_inst_name TEXT;
BEGIN
  FOR r IN (
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE email IS NOT NULL
      AND LOWER(TRIM(email)) NOT IN (SELECT LOWER(TRIM(institution_email)) FROM public.institution_code_registry)
    ORDER BY created_at ASC
  ) LOOP
    v_inst_name := COALESCE(NULLIF(TRIM(r.raw_user_meta_data->>'institution_name'), ''), 'Institution');

    SELECT COALESCE(MAX(NULLIF(regexp_replace(institution_code, '\D', '', 'g'), '')::INT), 0) + 1
    INTO v_next_num
    FROM public.institution_code_registry;

    v_code := LPAD(v_next_num::TEXT, 3, '0');

    INSERT INTO public.institution_code_registry (
      institution_code,
      institution_name,
      institution_email,
      institution_id
    ) VALUES (
      v_code,
      v_inst_name,
      LOWER(TRIM(r.email)),
      r.id
    )
    ON CONFLICT (institution_email) DO NOTHING;

    INSERT INTO public.profiles (
      id,
      institution_id,
      institution_code,
      email,
      institution_name,
      subscription_status,
      download_count
    ) VALUES (
      r.id,
      r.id,
      v_code,
      LOWER(TRIM(r.email)),
      v_inst_name,
      'Free Access',
      0
    )
    ON CONFLICT (id) DO UPDATE SET
      institution_code = EXCLUDED.institution_code,
      institution_id = EXCLUDED.institution_id;
  END LOOP;
END;
$$;

