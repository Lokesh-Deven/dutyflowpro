-- ==============================================================================
-- DUTYFLOW MIGRATION: Student Portal Realtime Sync & Data Retrieval
-- File: supabase/migrations/20261111_student_portal_sync_rpc.sql
-- ==============================================================================

-- 1. Ensure SELECT policy on saved_allotments for read-only portal synchronization
DROP POLICY IF EXISTS "Allow student read for saved allotments" ON public.saved_allotments;
CREATE POLICY "Allow student read for saved allotments"
  ON public.saved_allotments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Ensure examination_calendar public SELECT policy
DROP POLICY IF EXISTS "Public can read examination calendar" ON public.examination_calendar;
CREATE POLICY "Public can read examination calendar" 
  ON public.examination_calendar 
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- 3. Security Definer RPC for comprehensive student portal synchronization
CREATE OR REPLACE FUNCTION public.get_student_portal_sync_data(
  p_institution_code TEXT,
  p_institution_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code TEXT := LPAD(REGEXP_REPLACE(COALESCE(p_institution_code, ''), '\D', '', 'g'), 3, '0');
  v_inst_id UUID := NULL;
  v_inst_code TEXT := NULL;
  v_inst_name TEXT := 'Institution';
  v_calendar_items JSONB := '[]'::JSONB;
  v_workspace JSONB := NULL;
  v_allocations JSONB := '[]'::JSONB;
BEGIN
  -- 1. Resolve institution from code registry
  IF v_clean_code <> '000' THEN
    SELECT institution_id, institution_code, institution_name
    INTO v_inst_id, v_inst_code, v_inst_name
    FROM public.institution_code_registry
    WHERE institution_code = v_clean_code
    LIMIT 1;
  END IF;

  -- Fallback to profiles table if not found in registry
  IF v_inst_id IS NULL AND v_clean_code <> '000' THEN
    SELECT id, institution_code, COALESCE(institution_name, 'Institution')
    INTO v_inst_id, v_inst_code, v_inst_name
    FROM public.profiles
    WHERE institution_code = v_clean_code
    LIMIT 1;
  END IF;

  -- Fallback to passed institution_id if UUID is valid
  IF v_inst_id IS NULL AND p_institution_id IS NOT NULL THEN
    BEGIN
      v_inst_id := p_institution_id::UUID;
      SELECT institution_code, COALESCE(institution_name, 'Institution')
      INTO v_inst_code, v_inst_name
      FROM public.profiles
      WHERE id = v_inst_id
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_inst_id := NULL;
    END;
  END IF;

  IF v_inst_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Institution not found with code ' || COALESCE(p_institution_code, '')
    );
  END IF;

  -- 2. Fetch published examination calendar items
  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.slot_number ASC), '[]'::JSONB)
  INTO v_calendar_items
  FROM public.examination_calendar c
  WHERE (c.institution_id = v_inst_id::TEXT OR c.institution_code = v_inst_code)
    AND c.publication_status IN ('tentative_published', 'final_published');

  -- 3. Fetch workspace (contains subjects, studentsBySubject, seatingRooms)
  SELECT assignments->'workspace'
  INTO v_workspace
  FROM public.saved_allotments
  WHERE id = 'dutyflow_workspace_' || v_inst_id::TEXT
  LIMIT 1;

  -- 4. Fetch seating allocations
  SELECT COALESCE(
    jsonb_agg(
      COALESCE(assignments->'seatingAllocation', to_jsonb(s))
      ORDER BY created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_allocations
  FROM public.saved_allotments s
  WHERE (user_id = v_inst_id OR institution_id = v_inst_id)
    AND (
      assignments->>'_record_type' = 'SeatingAllocation'
      OR assignments ? 'seatingAllocation'
      OR id LIKE 'alloc-%'
    );

  RETURN jsonb_build_object(
    'success', true,
    'institutionId', v_inst_id::TEXT,
    'institutionCode', COALESCE(v_inst_code, v_clean_code),
    'institutionName', v_inst_name,
    'calendar', v_calendar_items,
    'workspace', v_workspace,
    'allocations', v_allocations,
    'syncedAt', NOW()
  );
END;
$$;

-- Grant execution to all users (including anon/student)
GRANT EXECUTE ON FUNCTION public.get_student_portal_sync_data(TEXT, TEXT) TO anon, authenticated, service_role;

