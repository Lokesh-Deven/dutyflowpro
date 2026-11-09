-- ==============================================================================
-- Migration: Super Admin System, Institution Approval Workflow, and Code Generation
-- File: supabase/migrations/20261110_superadmin_and_institution_approval.sql
-- ==============================================================================

-- 1. Create super_admins table
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL CHECK (email = 'lokeshconnects@gmail.com'),
  recovery_email TEXT NOT NULL DEFAULT 'lokeshdeven@gmail.com',
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Insert authorized Super Admin record if not already present
INSERT INTO public.super_admins (email, recovery_email, role)
VALUES ('lokeshconnects@gmail.com', 'lokeshdeven@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- 2. Create super_admin_otps table for secure 2FA email verification
CREATE TABLE IF NOT EXISTS public.super_admin_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_otps_lookup
  ON public.super_admin_otps (email, expires_at);

-- 3. Enhance profiles table with approval status columns
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add check constraint for approval_status enum values
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS check_approval_status;

ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT check_approval_status
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Ensure any existing active institution with a code is marked approved
UPDATE public.profiles
SET approval_status = 'approved'
WHERE institution_code IS NOT NULL AND trim(institution_code) <> '' AND approval_status = 'pending';

-- 4. Concurrency-Safe Sequence for Sequential 3-Digit Codes
CREATE SEQUENCE IF NOT EXISTS public.institution_code_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999;

-- Align sequence to start above any existing maximum code in institution_code_registry
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

-- 5. Updated Auth Trigger on auth.users:
-- Normal signups create a 'pending' profile WITHOUT generating an Institution Code!
CREATE OR REPLACE FUNCTION public.handle_new_institution_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_email TEXT;
  v_clean_name TEXT;
  v_is_non_admin BOOLEAN;
  v_existing_code TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(NEW.email, '')));
  IF v_clean_email = '' THEN
    RETURN NEW;
  END IF;

  -- Verify user type securely: Skip students and invigilators
  v_is_non_admin := (
    COALESCE(NEW.raw_user_meta_data->>'role', '') IN ('student', 'invigilator')
    OR COALESCE(NEW.raw_user_meta_data->>'user_type', '') IN ('student', 'invigilator')
    OR COALESCE(NEW.raw_user_meta_data->>'portal', '') IN ('student', 'invigilator')
  );

  IF v_is_non_admin THEN
    RETURN NEW;
  END IF;

  v_clean_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'institution_name'), ''), 'Institution');

  -- Check if this email was previously approved with an Institution Code (Reinstatement check)
  SELECT institution_code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_clean_email
  LIMIT 1;

  -- Create profile in 'pending' status.
  -- IMPORTANT: Institution Code is NOT assigned or activated until Super Admin approval!
  -- If re-registering a previously approved email, we record the pending status for re-verification.
  INSERT INTO public.profiles (
    id,
    institution_id,
    institution_code,
    email,
    institution_name,
    role,
    approval_status,
    subscription_status,
    download_count
  ) VALUES (
    NEW.id,
    NEW.id,
    v_existing_code, -- preserves original code reference if reinstated, or NULL if new
    v_clean_email,
    v_clean_name,
    'institution_admin',
    CASE WHEN v_existing_code IS NOT NULL THEN 'approved' ELSE 'pending' END,
    'Free Access',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = 'institution_admin',
    institution_name = COALESCE(NULLIF(EXCLUDED.institution_name, 'Institution'), profiles.institution_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_on_institution_admin_created ON auth.users;

CREATE TRIGGER trg_on_institution_admin_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_institution_admin();

-- 6. RPC Function: Super Admin Approves Institution & Generates Code
CREATE OR REPLACE FUNCTION public.approve_institution(
  p_institution_id UUID,
  p_admin_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT := LOWER(TRIM(COALESCE(p_admin_email, '')));
  v_rec RECORD;
  v_clean_email TEXT;
  v_clean_name TEXT;
  v_existing_code TEXT;
  v_next_val BIGINT;
  v_code TEXT;
BEGIN
  -- 1. Security Check: Only the authorized Super Admin may approve institutions
  IF v_admin_email <> 'lokeshconnects@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only the authorized Super Administrator may approve institutions.';
  END IF;

  -- 2. Fetch institution profile
  SELECT id, email, institution_name, institution_code, approval_status
  INTO v_rec
  FROM public.profiles
  WHERE id = p_institution_id
  LIMIT 1;

  IF v_rec.id IS NULL THEN
    RAISE EXCEPTION 'Institution profile not found for id %', p_institution_id;
  END IF;

  v_clean_email := LOWER(TRIM(COALESCE(v_rec.email, '')));
  v_clean_name := COALESCE(NULLIF(TRIM(v_rec.institution_name), ''), 'Institution');

  -- 3. Reinstatement rule: check if email already has a code in the registry
  SELECT institution_code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_clean_email
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    -- Restore original code without burning a sequence number
    v_code := v_existing_code;

    UPDATE public.institution_code_registry
    SET institution_id = p_institution_id,
        institution_name = v_clean_name,
        updated_at = NOW()
    WHERE institution_code = v_existing_code;
  ELSE
    -- Generate sequential 3-digit Institution Code concurrency-safely
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
  END IF;

  -- 4. Update institution profile to 'approved'
  UPDATE public.profiles
  SET approval_status = 'approved',
      institution_code = v_code,
      institution_id = p_institution_id,
      approved_by = v_admin_email,
      approved_at = NOW(),
      rejection_reason = NULL,
      updated_at = NOW()
  WHERE id = p_institution_id;

  RETURN jsonb_build_object(
    'success', true,
    'institution_id', p_institution_id,
    'institution_code', v_code,
    'institution_name', v_clean_name,
    'institution_email', v_clean_email,
    'approved_at', NOW()
  );
END;
$$;

-- 7. RPC Function: Super Admin Rejects Institution
CREATE OR REPLACE FUNCTION public.reject_institution(
  p_institution_id UUID,
  p_admin_email TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT := LOWER(TRIM(COALESCE(p_admin_email, '')));
  v_clean_reason TEXT := COALESCE(NULLIF(TRIM(p_reason), ''), 'Registration rejected by administrator.');
BEGIN
  IF v_admin_email <> 'lokeshconnects@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only the authorized Super Administrator may reject institutions.';
  END IF;

  UPDATE public.profiles
  SET approval_status = 'rejected',
      rejection_reason = v_clean_reason,
      approved_by = v_admin_email,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_institution_id;

  RETURN jsonb_build_object(
    'success', true,
    'institution_id', p_institution_id,
    'approval_status', 'rejected',
    'rejection_reason', v_clean_reason
  );
END;
$$;

-- 8. RPC Function: Super Admin Suspends Institution
CREATE OR REPLACE FUNCTION public.suspend_institution(
  p_institution_id UUID,
  p_admin_email TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT := LOWER(TRIM(COALESCE(p_admin_email, '')));
BEGIN
  IF v_admin_email <> 'lokeshconnects@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only the authorized Super Administrator may suspend institutions.';
  END IF;

  UPDATE public.profiles
  SET approval_status = 'suspended',
      rejection_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Institution operations suspended by Super Admin.'),
      updated_at = NOW()
  WHERE id = p_institution_id;

  RETURN jsonb_build_object('success', true, 'institution_id', p_institution_id, 'approval_status', 'suspended');
END;
$$;

-- 9. RPC Function: Super Admin Reactivates Institution
CREATE OR REPLACE FUNCTION public.reactivate_institution(
  p_institution_id UUID,
  p_admin_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT := LOWER(TRIM(COALESCE(p_admin_email, '')));
BEGIN
  IF v_admin_email <> 'lokeshconnects@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized: Only the authorized Super Administrator may reactivate institutions.';
  END IF;

  UPDATE public.profiles
  SET approval_status = 'approved',
      rejection_reason = NULL,
      updated_at = NOW()
  WHERE id = p_institution_id;

  RETURN jsonb_build_object('success', true, 'institution_id', p_institution_id, 'approval_status', 'approved');
END;
$$;

-- 10. RPC Function: Super Admin Dashboard Stats
CREATE OR REPLACE FUNCTION public.get_superadmin_stats(
  p_admin_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_pending INT;
  v_approved INT;
  v_suspended INT;
BEGIN
  IF LOWER(TRIM(COALESCE(p_admin_email, ''))) <> 'lokeshconnects@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.profiles WHERE id <> 'guest-session';
  SELECT COUNT(*) INTO v_pending FROM public.profiles WHERE approval_status = 'pending' AND id <> 'guest-session';
  SELECT COUNT(*) INTO v_approved FROM public.profiles WHERE approval_status = 'approved' AND id <> 'guest-session';
  SELECT COUNT(*) INTO v_suspended FROM public.profiles WHERE approval_status = 'suspended' AND id <> 'guest-session';

  RETURN jsonb_build_object(
    'total_institutions', v_total,
    'pending_approvals', v_pending,
    'approved_institutions', v_approved,
    'suspended_institutions', v_suspended
  );
END;
$$;

-- 11. Row-Level Security for Super Admin tables
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access for super admins" ON public.super_admins;
CREATE POLICY "Service role access for super admins"
  ON public.super_admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for super admin otps" ON public.super_admin_otps;
CREATE POLICY "Service role access for super admin otps"
  ON public.super_admin_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

