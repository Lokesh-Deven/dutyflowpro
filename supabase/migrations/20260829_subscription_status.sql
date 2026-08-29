-- Migration: 3-Tier Subscription Status & Quota Tracking for DutyFlow Profiles
-- Allows Supabase Admin to select from 'Subscribed', 'Unsubscribed', 'Free Access' in the Table Editor

-- 1. Ensure columns exist on profiles table
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Free Access',
  ADD COLUMN IF NOT EXISTS master_roster_downloads INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS individual_profile_downloads INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daywise_profile_downloads INT DEFAULT 0;

-- 2. Add or update check constraint for subscription_status enum values
ALTER TABLE IF EXISTS profiles
  DROP CONSTRAINT IF EXISTS check_subscription_status;

ALTER TABLE IF EXISTS profiles
  ADD CONSTRAINT check_subscription_status 
  CHECK (subscription_status IN ('Subscribed', 'Unsubscribed', 'Free Access'));

-- 3. Function to atomically increment category download counts with optional count amount
CREATE OR REPLACE FUNCTION increment_category_download(
  p_user_id UUID,
  p_category TEXT,
  p_count INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amt INT := GREATEST(COALESCE(p_count, 1), 1);
BEGIN
  IF p_category = 'master_roster' THEN
    UPDATE profiles
    SET master_roster_downloads = COALESCE(master_roster_downloads, 0) + v_amt,
        download_count = COALESCE(download_count, 0) + v_amt,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF p_category = 'individual_profile' THEN
    UPDATE profiles
    SET individual_profile_downloads = COALESCE(individual_profile_downloads, 0) + v_amt,
        download_count = COALESCE(download_count, 0) + v_amt,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF p_category = 'daywise_profile' THEN
    UPDATE profiles
    SET daywise_profile_downloads = COALESCE(daywise_profile_downloads, 0) + v_amt,
        download_count = COALESCE(download_count, 0) + v_amt,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET download_count = COALESCE(download_count, 0) + v_amt,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;
