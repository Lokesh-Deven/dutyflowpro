-- ==============================================================================
-- Table: public.institution_code_registry
-- Description: Registry of 3-digit institution codes ('001'-'999') mapped to
--              institutions and admin account UUIDs.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.institution_code_registry (
  -- 3-digit User-Facing Institution Code (Primary Key, e.g., '001', '002')
  institution_code TEXT PRIMARY KEY CHECK (institution_code ~ '^[0-9]{3}$'),

  -- Full Official Name of the Institution
  institution_name TEXT NOT NULL CHECK (char_length(trim(institution_name)) > 0),

  -- Registered Contact / Admin Email Address (Unique)
  institution_email TEXT NOT NULL,

  -- Internal Institution Account Identifier (Supabase auth.users UUID)
  institution_id UUID NOT NULL,

  -- Stored aliases for backward compatibility with existing queries
  code TEXT GENERATED ALWAYS AS (institution_code) STORED,
  email TEXT GENERATED ALWAYS AS (institution_email) STORED,

  -- Timestamps for audit and synchronization
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Email uniqueness constraint
  CONSTRAINT uq_institution_code_registry_email UNIQUE (institution_email)
);

-- ==============================================================================
-- Indexes
-- ==============================================================================

-- Case-insensitive unique index for email lookups during login/registration
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_registry_email_lower
  ON public.institution_code_registry (LOWER(TRIM(institution_email)));

-- Index for querying by internal institution_id
CREATE INDEX IF NOT EXISTS idx_institution_registry_institution_id
  ON public.institution_code_registry (institution_id);

-- ==============================================================================
-- Row-Level Security (RLS)
-- ==============================================================================

ALTER TABLE public.institution_code_registry ENABLE ROW LEVEL SECURITY;

-- Allow public read access so students and invigilators can verify institution codes
CREATE POLICY "Public can lookup institution codes"
  ON public.institution_code_registry
  FOR SELECT
  USING (true);

-- Allow authenticated users and service role to register new codes
CREATE POLICY "Authenticated users can insert institution codes"
  ON public.institution_code_registry
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Allow institution owners to update their own registry information
CREATE POLICY "Owners can update their institution record"
  ON public.institution_code_registry
  FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = institution_id);

