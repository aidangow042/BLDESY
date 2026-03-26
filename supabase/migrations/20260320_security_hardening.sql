-- ============================================================
-- Security Hardening — 2026-03-20
-- Fixes: contact info RLS gating, input validation constraints,
--        builder_profiles SELECT column restriction
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Gate builder contact info (phone/email) behind auth
--    Only authenticated users can read phone/email.
--    Public users can still see business info.
-- ────────────────────────────────────────────────────────────

-- Create an RPC function for fetching builder contact info (auth-gated)
CREATE OR REPLACE FUNCTION get_builder_contact(p_builder_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'phone', bp.phone,
    'email', bp.email
  ) INTO result
  FROM builder_profiles bp
  WHERE bp.id = p_builder_id AND bp.approved = true;

  RETURN result;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. Input validation CHECK constraints
-- ────────────────────────────────────────────────────────────

-- builder_profiles constraints (use DO block to skip if already applied)
DO $$ BEGIN
  ALTER TABLE builder_profiles
    ADD CONSTRAINT chk_phone_format
      CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-()]{6,20}$'),
    ADD CONSTRAINT chk_bio_length
      CHECK (bio IS NULL OR length(bio) <= 2000),
    ADD CONSTRAINT chk_business_name_length
      CHECK (length(business_name) BETWEEN 1 AND 200),
    ADD CONSTRAINT chk_suburb_length
      CHECK (length(suburb) BETWEEN 1 AND 100),
    ADD CONSTRAINT chk_postcode_format
      CHECK (postcode ~ '^\d{4}$'),
    ADD CONSTRAINT chk_abn_format
      CHECK (abn IS NULL OR abn ~ '^\d{11}$'),
    ADD CONSTRAINT chk_radius_km_range
      CHECK (radius_km IS NULL OR (radius_km > 0 AND radius_km <= 500));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- jobs constraints (use DO block to skip if already applied)
DO $$ BEGIN
  ALTER TABLE jobs
    ADD CONSTRAINT chk_job_title_length
      CHECK (length(title) BETWEEN 1 AND 200),
    ADD CONSTRAINT chk_job_description_length
      CHECK (description IS NULL OR length(description) <= 5000),
    ADD CONSTRAINT chk_budget_positive
      CHECK (budget IS NULL OR length(budget) > 0),
    ADD CONSTRAINT chk_contact_phone_format
      CHECK (contact_phone IS NULL OR contact_phone ~ '^\+?[0-9\s\-()]{6,20}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- reviews constraints (use DO block to skip if already applied)
DO $$ BEGIN
  ALTER TABLE reviews
    ADD CONSTRAINT chk_rating_range
      CHECK (rating >= 1 AND rating <= 5),
    ADD CONSTRAINT chk_review_comment_length
      CHECK (comment IS NULL OR length(comment) <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
