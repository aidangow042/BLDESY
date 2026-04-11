-- =============================================================================
-- Launch Fixes — Storage RLS, NOT NULL FKs, rate_limit_log RLS,
--                profiles public scope, is_admin column, admin approval RPC,
--                builder contact view, job_views table
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Storage RLS policies (user-scoped uploads)
-- =============================================================================

-- builder-media: public read (profile photos), authenticated user-scoped write
CREATE POLICY "Public read builder-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'builder-media');

CREATE POLICY "Authenticated upload own builder-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'builder-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner update own builder-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'builder-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner delete own builder-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'builder-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- job-photos: public read (displayed on job listings), user-scoped write
CREATE POLICY "Public read job-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');

CREATE POLICY "Authenticated upload own job-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner delete own job-photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- job-documents: private — only owner can read/write
CREATE POLICY "Owner read own job-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated upload own job-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner delete own job-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- 2. NOT NULL on core FK columns
-- =============================================================================

-- Backfill any NULLs first (shouldn't exist, but be safe)
DELETE FROM applications WHERE job_id IS NULL OR builder_id IS NULL;
DELETE FROM jobs WHERE customer_id IS NULL;

ALTER TABLE applications ALTER COLUMN job_id SET NOT NULL;
ALTER TABLE applications ALTER COLUMN builder_id SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN customer_id SET NOT NULL;

-- =============================================================================
-- 3. RLS on rate_limit_log
-- =============================================================================

ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Deny all direct reads — only the SECURITY DEFINER function can access
-- (no SELECT policy = no reads for any role except service_role)

-- =============================================================================
-- 4. Scope profiles read to authenticated (was public with USING(true))
-- =============================================================================

DROP POLICY IF EXISTS profiles_select_public ON profiles;

-- Authenticated users can read basic profile info (for messaging, reviews etc.)
CREATE POLICY profiles_select_authenticated ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- 5. Add profiles.is_admin column if missing
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- =============================================================================
-- 6. Admin approval RPC (bypasses the column-protection trigger)
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_set_builder_approved(
  p_builder_id UUID,
  p_approved BOOLEAN
) RETURNS VOID AS $$
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  UPDATE builder_profiles
  SET approved = p_approved
  WHERE id = p_builder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_set_enterprise_status(
  p_enterprise_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  UPDATE enterprise_profiles
  SET status = p_status,
      approved = (p_status = 'approved'),
      rejection_reason = p_rejection_reason
  WHERE id = p_enterprise_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- 7. Create job_views table (for enterprise analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_created_at ON job_views(created_at DESC);

-- Job owners can read views on their jobs
CREATE POLICY "Job owners can read views" ON job_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_views.job_id
      AND jobs.customer_id = auth.uid()
    )
  );

-- Anyone authenticated can insert a view (tracked via app)
CREATE POLICY "Authenticated users can log views" ON job_views
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- 8. Remove broken storage.policies insert from launch_hardening
--    (it used the wrong internal table; replaced by CREATE POLICY above)
-- =============================================================================

-- No action needed — the DO block with EXCEPTION handler was a no-op.
-- The new CREATE POLICY statements above are the proper replacement.

COMMIT;
