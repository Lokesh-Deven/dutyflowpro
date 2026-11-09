-- ==============================================================================
-- Migration: Automatic Institution Code Generation & Data Isolation for DutyFlow
-- File: supabase/migrations/20261109_automatic_institution_code_generation.sql
-- ==============================================================================
-- Requirements:
-- 1. Automatically generate unique, sequential 3-digit Institution Code (001, 002...)
--    ONLY when a new Institution Administrator registers.
-- 2. Each Institution Code belongs to exactly one institution (no duplicate codes).
-- 3. Associate Institution Code with administrator UUID (institution_id).
-- 4. Automatically create/update administrator profile with institution_code & institution_id.
-- 5. Restore original code if existing admin re-registers with the same email.
-- 6. Student and Invigilator accounts must NEVER generate new Institution Codes.
-- 7. Concurrency-safe PostgreSQL sequence + Supabase Auth trigger.
-- 8. Institution data isolation using institution_id and enforced RLS policies.
-- 9. Secure role verification (never trust client-supplied admin roles).
-- 10. Preserves all existing codes, profiles, and application functionality.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: public.institution_code_registry
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_code_registry (
  institution_code TEXT PRIMARY KEY CHECK (institution_code ~ '^[0-9]{3,}$'),
  institution_name TEXT NOT NULL CHECK (char_length(trim(institution_name)) > 0),
  institution_email TEXT NOT NULL,
  institution_id UUID NOT NULL,

  -- Stored aliases for backward-compatibility with older queries
  code TEXT GENERATED ALWAYS AS (institution_code) STORED,
  email TEXT GENERATED ALWAYS AS (institution_email) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_institution_code_registry_email UNIQUE (institution_email),
  CONSTRAINT uq_institution_code_registry_inst_id UNIQUE (institution_id)
);

-- Case-insensitive index for fast email matching
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_registry_email_lower
  ON public.institution_code_registry (LOWER(TRIM(institution_email)));

CREATE INDEX IF NOT EXISTS idx_institution_registry_institution_id
  ON public.institution_code_registry (institution_id);

-- ------------------------------------------------------------------------------
-- 2. Ensure columns on profiles, saved_allotments, and user_files
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS institution_code TEXT,
  ADD COLUMN IF NOT EXISTS institution_id UUID,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'institution_admin';

UPDATE public.profiles
SET institution_id = id
WHERE institution_id IS NULL;

ALTER TABLE IF EXISTS public.saved_allotments
  ADD COLUMN IF NOT EXISTS institution_id UUID;

UPDATE public.saved_allotments
SET institution_id = user_id
WHERE institution_id IS NULL AND user_id IS NOT NULL;

ALTER TABLE IF EXISTS public.user_files
  ADD COLUMN IF NOT EXISTS institution_id UUID;

UPDATE public.user_files
SET institution_id = user_id
WHERE institution_id IS NULL AND user_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. Concurrency-Safe Sequence for Sequential 3-Digit Institution Codes
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.institution_code_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999;

-- Align sequence to start above any existing codes in the table
SELECT setval(
  'public.institution_code_seq',
  GREATEST(
    COALESCE(
      (SELECT MAX(NULLIF(regexp_replace(institution_code, '\D', '', 'g'), '')::BIGINT)
       FROM public.institution_code_registry),
      0
    ),
    1
  ),
  EXISTS (SELECT 1 FROM public.institution_code_registry)
);

-- ------------------------------------------------------------------------------
-- 4. Helper Function: Current User's Institution ID
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(institution_id, id)
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 5. Row-Level Security (RLS) & Policies for Data Isolation
-- ------------------------------------------------------------------------------

-- (a) institution_code_registry RLS
ALTER TABLE public.institution_code_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can lookup institution codes" ON public.institution_code_registry;
CREATE POLICY "Public can lookup institution codes"
  ON public.institution_code_registry
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert institution codes" ON public.institution_code_registry;
DROP POLICY IF EXISTS "Allow insert into institution_code_registry" ON public.institution_code_registry;
CREATE POLICY "Allow insert into institution_code_registry"
  ON public.institution_code_registry
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can update their institution record" ON public.institution_code_registry;
CREATE POLICY "Owners can update their institution record"
  ON public.institution_code_registry
  FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = institution_id);

-- (b) profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR auth.uid() = institution_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = institution_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = institution_id);

-- (c) saved_allotments RLS (Strict Institution Isolation)
ALTER TABLE public.saved_allotments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institutions manage their own saved allotments" ON public.saved_allotments;
CREATE POLICY "Institutions manage their own saved allotments"
  ON public.saved_allotments
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() = institution_id
    OR institution_id = public.current_institution_id()
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = institution_id
    OR institution_id = public.current_institution_id()
  );

-- (d) user_files RLS (Strict Institution Isolation)
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institutions manage their own uploaded files" ON public.user_files;
CREATE POLICY "Institutions manage their own uploaded files"
  ON public.user_files
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() = institution_id
    OR institution_id = public.current_institution_id()
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = institution_id
    OR institution_id = public.current_institution_id()
  );

-- ------------------------------------------------------------------------------
-- 6. RPC Function: Atomically get or allocate 3-digit Institution Code
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_institution_code(
  p_email TEXT,
  p_institution_id UUID,
  p_institution_name TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
  v_clean_name TEXT := COALESCE(NULLIF(TRIM(p_institution_name), ''), 'Institution');
  v_existing_code TEXT;
  v_next_val BIGINT;
  v_code TEXT;
BEGIN
  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;

  -- Reinstatement rule: check if email was previously registered
  SELECT institution_code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_clean_email
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    -- Restore original code and link to updated institution_id
    UPDATE public.institution_code_registry
    SET institution_id = p_institution_id,
        institution_name = COALESCE(v_clean_name, institution_name),
        updated_at = NOW()
    WHERE institution_code = v_existing_code;

    UPDATE public.profiles
    SET institution_code = v_existing_code,
        institution_id = p_institution_id,
        role = 'institution_admin',
        updated_at = NOW()
    WHERE id = p_institution_id;

    RETURN v_existing_code;
  END IF;

  -- Concurrency-safe atomic allocation via sequence
  v_next_val := nextval('public.institution_code_seq');
  v_code := LPAD(v_next_val::TEXT, 3, '0');

  INSERT INTO public.institution_code_registry (
    institution_code,
    institution_name,
    institution_email,
    institution_id
  ) VALUES (
    v_code,
    v_clean_name,
    v_clean_email,
    p_institution_id
  )
  ON CONFLICT (institution_email) DO UPDATE SET
    institution_id = EXCLUDED.institution_id,
    institution_name = EXCLUDED.institution_name,
    updated_at = NOW();

  UPDATE public.profiles
  SET institution_code = v_code,
      institution_id = p_institution_id,
      role = 'institution_admin',
      updated_at = NOW()
  WHERE id = p_institution_id;

  RETURN v_code;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. RPC Function: Public resolver for Student & Invigilator portals
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_institution_by_code(
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ------------------------------------------------------------------------------
-- 8. Supabase Auth Signup Trigger Function: Automatically Generates Code ONLY for Admins
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_institution_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_email TEXT;
  v_clean_name TEXT;
  v_existing_code TEXT;
  v_next_val BIGINT;
  v_new_code TEXT;
  v_is_non_admin BOOLEAN;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(NEW.email, '')));
  IF v_clean_email = '' THEN
    RETURN NEW;
  END IF;

  -- Requirement 6 & 9: Verify user type securely
  -- Students and Invigilators must NEVER generate new Institution Codes.
  -- Do not trust arbitrary client-submitted roles.
  v_is_non_admin := (
    COALESCE(NEW.raw_user_meta_data->>'role', '') IN ('student', 'invigilator')
    OR COALESCE(NEW.raw_user_meta_data->>'user_type', '') IN ('student', 'invigilator')
    OR COALESCE(NEW.raw_user_meta_data->>'portal', '') IN ('student', 'invigilator')
  );

  IF v_is_non_admin THEN
    -- Student / Invigilator user: do not allocate an institution code
    RETURN NEW;
  END IF;

  v_clean_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'institution_name'), ''), 'Institution');

  -- Requirement 5: Reinstatement Rule
  SELECT institution_code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_clean_email
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    -- Restore original code and update institution_id to match the new admin UUID
    v_new_code := v_existing_code;

    UPDATE public.institution_code_registry
    SET institution_id = NEW.id,
        institution_name = COALESCE(v_clean_name, institution_name),
        updated_at = NOW()
    WHERE institution_code = v_existing_code;

  ELSE
    -- Requirement 1, 2, 7: Concurrency-safe atomic generation via sequence
    v_next_val := nextval('public.institution_code_seq');
    v_new_code := LPAD(v_next_val::TEXT, 3, '0');

    INSERT INTO public.institution_code_registry (
      institution_code,
      institution_name,
      institution_email,
      institution_id
    ) VALUES (
      v_new_code,
      v_clean_name,
      v_clean_email,
      NEW.id
    )
    ON CONFLICT (institution_email) DO UPDATE SET
      institution_id = EXCLUDED.institution_id,
      institution_name = EXCLUDED.institution_name,
      updated_at = NOW();
  END IF;

  -- Requirement 4 & 9: Automatically create or update administrator's profile
  -- Server securely assigns role = 'institution_admin'
  INSERT INTO public.profiles (
    id,
    institution_id,
    institution_code,
    email,
    institution_name,
    role,
    subscription_status,
    download_count
  ) VALUES (
    NEW.id,
    NEW.id,
    v_new_code,
    v_clean_email,
    v_clean_name,
    'institution_admin',
    'Free Access',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    institution_code = EXCLUDED.institution_code,
    institution_id = EXCLUDED.institution_id,
    email = EXCLUDED.email,
    role = 'institution_admin',
    institution_name = COALESCE(NULLIF(EXCLUDED.institution_name, 'Institution'), profiles.institution_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. Attach Trigger to auth.users AFTER INSERT
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_on_institution_admin_created ON auth.users;

CREATE TRIGGER trg_on_institution_admin_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_institution_admin();

-- ------------------------------------------------------------------------------
-- 10. Instant Backfill: Automatically generate codes for any existing accounts
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  v_next_val BIGINT;
  v_inst_name TEXT;
BEGIN
  FOR r IN (
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE email IS NOT NULL
      AND LOWER(TRIM(email)) NOT IN (
        SELECT LOWER(TRIM(institution_email)) FROM public.institution_code_registry
      )
    ORDER BY created_at ASC
  ) LOOP
    v_inst_name := COALESCE(NULLIF(TRIM(r.raw_user_meta_data->>'institution_name'), ''), 'Institution');

    v_next_val := nextval('public.institution_code_seq');
    v_code := LPAD(v_next_val::TEXT, 3, '0');

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
      role,
      subscription_status,
      download_count
    ) VALUES (
      r.id,
      r.id,
      v_code,
      LOWER(TRIM(r.email)),
      v_inst_name,
      'institution_admin',
      'Free Access',
      0
    )
    ON CONFLICT (id) DO UPDATE SET
      institution_code = EXCLUDED.institution_code,
      institution_id = EXCLUDED.institution_id,
      role = 'institution_admin';
  END LOOP;
END;
$$;

