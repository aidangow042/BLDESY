-- ============================================================
-- RLS Security Fixes — 2026-03-25
-- Fixes: H2 (contact field gating), H3 (builder role on apply),
--        H4 (jobs visibility), job_photos/docs visibility
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- H3: Applications INSERT — require approved builder
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Builders can apply to jobs" ON applications;
CREATE POLICY "Builders can apply to jobs" ON applications
  FOR INSERT
  WITH CHECK (
    auth.uid() = builder_id
    AND EXISTS (
      SELECT 1 FROM builder_profiles
      WHERE user_id = auth.uid() AND approved = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- H4: Jobs SELECT — customers see own jobs, approved builders see open jobs
-- Drop the overly permissive policy that lets everyone see open jobs
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own jobs and open jobs" ON jobs;
DROP POLICY IF EXISTS "Approved builders can view open jobs" ON jobs;
DROP POLICY IF EXISTS "Customers can view their own jobs" ON jobs;
-- Also drop any other SELECT policies on jobs to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'jobs' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON jobs', pol.policyname);
  END LOOP;
END $$;

-- Customers see their own jobs (any status)
CREATE POLICY "Customers can view their own jobs" ON jobs
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Approved builders see open jobs only
CREATE POLICY "Approved builders can view open jobs" ON jobs
  FOR SELECT
  USING (
    status = 'open'::text
    AND EXISTS (
      SELECT 1 FROM builder_profiles
      WHERE user_id = auth.uid() AND approved = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- Job photos/documents — let builders see photos on open jobs
-- (not just job owners)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Job owners can view photos" ON job_photos;
DROP POLICY IF EXISTS "Users can view job photos" ON job_photos;
-- Drop all SELECT policies on job_photos
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'job_photos' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON job_photos', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view job photos" ON job_photos
  FOR SELECT
  USING (
    is_job_owner(job_id)
    OR EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_photos.job_id AND jobs.status = 'open'::text
      AND EXISTS (
        SELECT 1 FROM builder_profiles
        WHERE user_id = auth.uid() AND approved = true
      )
    )
  );

DROP POLICY IF EXISTS "Job owners can view documents" ON job_documents;
DROP POLICY IF EXISTS "Users can view job documents" ON job_documents;
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'job_documents' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON job_documents', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view job documents" ON job_documents
  FOR SELECT
  USING (
    is_job_owner(job_id)
    OR EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_documents.job_id AND jobs.status = 'open'::text
      AND EXISTS (
        SELECT 1 FROM builder_profiles
        WHERE user_id = auth.uid() AND approved = true
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- H2: Server-side contact field gating via RPC
-- Only job owners and accepted applicants can see contact info
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_job_contact(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_customer_id uuid;
BEGIN
  -- Get the job's customer_id
  SELECT customer_id INTO v_customer_id FROM jobs WHERE id = p_job_id;
  IF v_customer_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Allow if: job owner OR accepted applicant
  IF auth.uid() = v_customer_id
     OR EXISTS (
       SELECT 1 FROM applications
       WHERE job_id = p_job_id
         AND builder_id = auth.uid()
         AND status = 'accepted'
     )
  THEN
    SELECT jsonb_build_object(
      'contact_phone', j.contact_phone,
      'contact_email', j.contact_email
    ) INTO result
    FROM jobs j WHERE j.id = p_job_id;
    RETURN result;
  END IF;

  RETURN NULL;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- M5: Reviews INSERT — only the customer on an accepted job can review
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON reviews', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Customers can review builders on accepted jobs" ON reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.builder_id = reviews.reviewee_id
        AND j.customer_id = auth.uid()
        AND a.status = 'accepted'
    )
  );

-- Make reviews readable by everyone (builder profile pages show them)
-- Check if a SELECT policy already exists; if not, create one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews' AND cmd = 'SELECT'
    AND policyname = 'Anyone can read reviews'
  ) THEN
    CREATE POLICY "Anyone can read reviews" ON reviews
      FOR SELECT USING (true);
  END IF;
END $$;
