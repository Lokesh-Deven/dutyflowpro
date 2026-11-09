-- ==============================================================================
-- DUTYFLOW CONSOLIDATED MIGRATION:
-- Super Admin Dashboard, Institution Approval System, and Automated Code Generation
-- File: supabase/migrations/20261110_superadmin_and_institution_approval.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure institution_code_registry table exists with required constraints
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_code_registry (
  institution_code TEXT PRIMARY KEY,
  institution_name TEXT NOT NULL,
  institution_email TEXT UNIQUE NOT NULL,
  institution_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_registry_email 
  ON public.institution_code_registry (LOWER(TRIM(institution_email)));

CREATE INDEX IF NOT EXISTS idx_inst_registry_inst_id 
  ON public.institution_code_registry (institution_id);

-- ------------------------------------------------------------------------------
-- 2. Ensure Super Admin identity & 2FA tables exist
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL CHECK (email = 'lokeshconnects@gmail.com'),
  recovery_email TEXT NOT NULL DEFAULT 'lokeshdeven@gmail.com',
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

INSERT INTO public.super_admins (email, recovery_email, role)
VALUES ('lokeshconnects@gmail.com', 'lokeshdeven@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  recovery_email = 'lokeshdeven@gmail.com',
  role = 'super_admin';

CREATE TABLE IF NOT EXISTS public.super_admin_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_otps_lookup
  ON public.super_admin_otps (email, expires_at);

-- ------------------------------------------------------------------------------
-- 3. Ensure profiles table has all required columns and constraints
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  institution_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS institution_code TEXT,
  ADD COLUMN IF NOT EXISTS institution_id UUID,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'institution_admin',
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Free Access',
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_roster_downloads INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS individual_profile_downloads INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daywise_profile_downloads INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signatory_name TEXT,
  ADD COLUMN IF NOT EXISTS signatory_designation TEXT;

-- Safely add or update approval status check constraint
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS check_approval_status;

ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT check_approval_status
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Ensure any existing institution in registry is marked approved in profiles
UPDATE public.profiles p
SET 
  approval_status = 'approved',
  institution_code = reg.institution_code,
  institution_id = COALESCE(p.institution_id, reg.institution_id, p.id)
FROM public.institution_code_registry reg
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(reg.institution_email));

-- ------------------------------------------------------------------------------
-- 4. Concurrency-Safe Sequence for Sequential 3-Digit Institution Codes
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.institution_code_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999;

-- Advance sequence past any existing codes in the registry
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
-- 5. Backfill existing registered users from auth.users into public.profiles
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (
  id,
  institution_id,
  institution_code,
  email,
  institution_name,
  role,
  approval_status,
  subscription_status,
  download_count,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.id,
  reg.institution_code,
  LOWER(TRIM(u.email)),
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'institution_name'), ''), 'Institution'),
  'institution_admin',
  CASE 
    WHEN reg.institution_code IS NOT NULL THEN 'approved'
    ELSE 'pending'
  END,
  'Free Access',
  0,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.institution_code_registry reg 
  ON LOWER(TRIM(reg.institution_email)) = LOWER(TRIM(u.email))
WHERE u.email IS NOT NULL 
  AND u.email NOT LIKE '%@dutyflow.internal'
  AND (
    u.raw_user_meta_data->>'role' IS NULL 
    OR u.raw_user_meta_data->>'role' NOT IN ('student', 'invigilator')
  )
ON CONFLICT (id) DO UPDATE SET
  institution_name = COALESCE(NULLIF(EXCLUDED.institution_name, 'Institution'), profiles.institution_name),
  institution_id = COALESCE(profiles.institution_id, EXCLUDED.institution_id),
  institution_code = COALESCE(profiles.institution_code, EXCLUDED.institution_code),
  approval_status = CASE 
    WHEN profiles.institution_code IS NOT NULL AND profiles.institution_code <> '' THEN 'approved'
    WHEN EXCLUDED.institution_code IS NOT NULL AND EXCLUDED.institution_code <> '' THEN 'approved'
    ELSE profiles.approval_status
  END,
  updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 6. Supabase Auth Trigger for New User Registrations
-- Normal signups create a 'pending' profile WITHOUT generating an Institution Code!
-- Student & invigilator registrations NEVER create codes or pending registrations.
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
  v_is_non_admin BOOLEAN;
  v_existing_code TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(NEW.email, '')));
  IF v_clean_email = '' THEN
    RETURN NEW;
  END IF;

  -- 1. Strictly verify user type: Skip students and invigilators
  v_is_non_admin := (
    COALESCE(NEW.raw_user_meta_data->>'role', '') IN ('student', 'invigilator')
    OR COALESCE(NEW.raw_user_meta_data->>'user_type', '') IN ('student', 'invigilator')
    OR COALESCE(NEW.raw_user_meta_data->>'portal', '') IN ('student', 'invigilator')
  );

  IF v_is_non_admin THEN
    RETURN NEW;
  END IF;

  v_clean_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'institution_name'), ''), 'Institution');

  -- 2. Check if this email was previously approved with an Institution Code (Reinstatement rule)
  SELECT institution_code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_clean_email
  LIMIT 1;

  -- 3. Insert profile in 'pending' status without assigning a new code
  INSERT INTO public.profiles (
    id,
    institution_id,
    institution_code,
    email,
    institution_name,
    role,
    approval_status,
    subscription_status,
    download_count,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    v_existing_code, -- preserves existing code if previously registered, else NULL
    v_clean_email,
    v_clean_name,
    'institution_admin',
    CASE WHEN v_existing_code IS NOT NULL THEN 'approved' ELSE 'pending' END,
    'Free Access',
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = 'institution_admin',
    institution_name = COALESCE(NULLIF(EXCLUDED.institution_name, 'Institution'), profiles.institution_name),
    institution_id = COALESCE(profiles.institution_id, EXCLUDED.institution_id),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_institution_admin_created ON auth.users;
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_institution_admin_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_institution_admin();

-- ------------------------------------------------------------------------------
-- 7. RPC: Register Pending Institution (Called from signup API / client fallback)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_pending_institution(
  p_user_id UUID,
  p_email TEXT,
  p_institution_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
  v_clean_name TEXT := COALESCE(NULLIF(TRIM(p_institution_name), ''), 'Institution');
  v_existing_code TEXT;
BEGIN
  IF v_clean_email = '' OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email or user ID');
  END IF;

  -- Check if previously approved code exists for this email
  SELECT institution_code INTO v_existing_code
  FROM public.institution_code_registry
  WHERE LOWER(TRIM(institution_email)) = v_clean_email
  LIMIT 1;

  INSERT INTO public.profiles (
    id,
    institution_id,
    institution_code,
    email,
    institution_name,
    role,
    approval_status,
    subscription_status,
    download_count,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_user_id,
    v_existing_code,
    v_clean_email,
    v_clean_name,
    'institution_admin',
    CASE WHEN v_existing_code IS NOT NULL THEN 'approved' ELSE 'pending' END,
    'Free Access',
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    institution_name = COALESCE(NULLIF(EXCLUDED.institution_name, 'Institution'), profiles.institution_name),
    institution_id = COALESCE(profiles.institution_id, EXCLUDED.institution_id),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'institution_id', p_user_id,
    'institution_name', v_clean_name,
    'approval_status', CASE WHEN v_existing_code IS NOT NULL THEN 'approved' ELSE 'pending' END
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. RPC: Get Institution Registrations (For Super Admin Console)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_institution_registrations(
  p_status TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  institution_id UUID,
  institution_code TEXT,
  institution_name TEXT,
  email TEXT,
  role TEXT,
  approval_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  subscription_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.institution_id, p.id) AS institution_id,
    COALESCE(p.institution_code, reg.institution_code, '') AS institution_code,
    COALESCE(NULLIF(p.institution_name, ''), 'Institution') AS institution_name,
    COALESCE(p.email, u.email, '') AS email,
    COALESCE(p.role, 'institution_admin') AS role,
    COALESCE(
      p.approval_status,
      CASE WHEN reg.institution_code IS NOT NULL THEN 'approved' ELSE 'pending' END
    ) AS approval_status,
    p.approved_at,
    p.approved_by,
    p.rejection_reason,
    COALESCE(p.created_at, u.created_at, NOW()) AS created_at,
    COALESCE(p.updated_at, NOW()) AS updated_at,
    COALESCE(p.subscription_status, 'Free Access') AS subscription_status
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.institution_code_registry reg 
    ON LOWER(TRIM(reg.institution_email)) = LOWER(TRIM(COALESCE(p.email, u.email, '')))
  WHERE p.id IS NOT NULL
    AND (
      p_status = 'all' 
      OR p_status IS NULL 
      OR (
        COALESCE(
          p.approval_status,
          CASE WHEN reg.institution_code IS NOT NULL THEN 'approved' ELSE 'pending' END
        ) = p_status
      )
    )
  ORDER BY p.created_at DESC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. RPC: Super Admin Approves Institution & Generates Sequential Code
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 10. RPC: Super Admin Rejects Institution
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 11. RPC: Super Admin Suspends Institution
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 12. RPC: Super Admin Reactivates Institution
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 13. RPC: Super Admin Dashboard Stats
-- ------------------------------------------------------------------------------
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

  SELECT COUNT(*) INTO v_total FROM public.profiles WHERE id IS NOT NULL;
  SELECT COUNT(*) INTO v_pending FROM public.profiles WHERE approval_status = 'pending';
  SELECT COUNT(*) INTO v_approved FROM public.profiles WHERE approval_status = 'approved';
  SELECT COUNT(*) INTO v_suspended FROM public.profiles WHERE approval_status = 'suspended';

  RETURN jsonb_build_object(
    'total_institutions', v_total,
    'pending_approvals', v_pending,
    'approved_institutions', v_approved,
    'suspended_institutions', v_suspended
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 14. Row-Level Security Policies (Ensure Public/Super Admin Queries Work)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_code_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_otps ENABLE ROW LEVEL SECURITY;

-- Allow reading profiles so user dashboard and super admin can read
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;
CREATE POLICY "Public can insert profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update profiles" ON public.profiles;
CREATE POLICY "Public can update profiles" ON public.profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow reading institution code registry
DROP POLICY IF EXISTS "Public can read registry" ON public.institution_code_registry;
CREATE POLICY "Public can read registry" ON public.institution_code_registry
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role access for registry" ON public.institution_code_registry;
CREATE POLICY "Service role access for registry" ON public.institution_code_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Super admin security policies
DROP POLICY IF EXISTS "Service role access for super admins" ON public.super_admins;
CREATE POLICY "Service role access for super admins" ON public.super_admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for super admin otps" ON public.super_admin_otps;
CREATE POLICY "Service role access for super admin otps" ON public.super_admin_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 15. Grant Execution Rights to Anon and Authenticated Roles
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_institution_registrations TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_institution TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_institution TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suspend_institution TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_institution TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_superadmin_stats TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_pending_institution TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.institution_code_seq TO anon, authenticated, service_role;
