-- =============================================================================
-- P0 Security Fixes — Role injection, subscription_tier, rate limit exposure,
--                      nullable FKs, reviews constraints
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Fix handle_new_user — only allow 'customer' or 'builder' role from metadata
--    Prevents privilege escalation via signup metadata (e.g. role='admin')
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  requested_role TEXT;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  -- Only allow 'customer' or 'builder' — anything else defaults to 'customer'
  IF requested_role NOT IN ('customer', 'builder') THEN
    requested_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, role, name)
  VALUES (NEW.id, requested_role, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. Protect profiles.role from client-side UPDATE
--    Only service_role (via RPCs/Edge Functions) can change a user's role.
-- =============================================================================

CREATE OR REPLACE FUNCTION protect_profiles_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  ) THEN
    -- Silently revert role and is_admin to prevent client-side tampering
    NEW.role := OLD.role;
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the old is_admin-only trigger with one that protects both role and is_admin
DROP TRIGGER IF EXISTS protect_profiles_admin_cols_trigger ON profiles;
DROP TRIGGER IF EXISTS protect_profiles_role_trigger ON profiles;

CREATE TRIGGER protect_profiles_role_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profiles_role();

-- =============================================================================
-- 3. RPC for enterprise role upgrade (replaces direct client UPDATE)
--    Verifies enterprise_profiles row exists before allowing role change.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_role_enterprise()
RETURNS VOID AS $$
BEGIN
  -- Verify the caller has a valid enterprise profile
  IF NOT EXISTS (
    SELECT 1 FROM enterprise_profiles
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No enterprise profile found — complete signup first';
  END IF;

  UPDATE profiles SET role = 'enterprise' WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- 4. Protect subscription_tier in builder_profiles admin-column trigger
--    Prevents builders from self-upgrading their subscription tier.
-- =============================================================================

CREATE OR REPLACE FUNCTION protect_builder_profiles_admin_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  ) THEN
    -- Silently revert admin-only columns
    NEW.approved := OLD.approved;
    NEW.subscription_tier := OLD.subscription_tier;
    BEGIN NEW.status := OLD.status; EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN NEW.approved_at := OLD.approved_at; EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN NEW.rejection_reason := OLD.rejection_reason; EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN NEW.stripe_customer_id := OLD.stripe_customer_id; EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN NEW.stripe_subscription_id := OLD.stripe_subscription_id; EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN NEW.subscription_plan := OLD.subscription_plan; EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN NEW.subscription_status := OLD.subscription_status; EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN NEW.paid_at := OLD.paid_at; EXCEPTION WHEN undefined_column THEN NULL; END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from 20260412, this just updates the function body

-- =============================================================================
-- 5. Revoke EXECUTE on check_rate_limit from non-service roles
--    Only SECURITY DEFINER trigger functions need to call it.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM public;

-- =============================================================================
-- 6. builder_profiles.user_id — NOT NULL + UNIQUE
-- =============================================================================

-- Clean up any orphan rows first
DELETE FROM builder_profiles WHERE user_id IS NULL;

ALTER TABLE builder_profiles ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'builder_profiles_user_id_unique'
  ) THEN
    ALTER TABLE builder_profiles
      ADD CONSTRAINT builder_profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- =============================================================================
-- 7. reviews — NOT NULL on core columns, UNIQUE constraint, CASCADE FK
-- =============================================================================

-- Clean up any orphan rows
DELETE FROM reviews WHERE reviewer_id IS NULL OR reviewee_id IS NULL OR job_id IS NULL OR rating IS NULL;

ALTER TABLE reviews ALTER COLUMN reviewer_id SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN reviewee_id SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN job_id SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL;

-- Prevent duplicate reviews (one per reviewer per job)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_unique_reviewer_job'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_unique_reviewer_job UNIQUE (job_id, reviewer_id);
  END IF;
END $$;

-- Fix reviews FK to CASCADE on job delete (currently NO ACTION which blocks deletion)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_job_id_fkey;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- =============================================================================
-- 8. Add missing index on builder_profiles(user_id)
--    Every builder screen queries by user_id — currently a sequential scan.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_builder_profiles_user_id ON builder_profiles(user_id);

-- =============================================================================
-- 9. CHECK constraints on core enum-like text columns
-- =============================================================================

-- jobs.status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_status') THEN
    ALTER TABLE jobs ADD CONSTRAINT chk_jobs_status
      CHECK (status IN ('open', 'in_progress', 'closed', 'filled', 'cancelled'));
  END IF;
END $$;

-- jobs.urgency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_urgency') THEN
    ALTER TABLE jobs ADD CONSTRAINT chk_jobs_urgency
      CHECK (urgency IN ('emergency', 'urgent', 'soon', 'planned', 'flexible'));
  END IF;
END $$;

-- applications.status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_applications_status') THEN
    ALTER TABLE applications ADD CONSTRAINT chk_applications_status
      CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'));
  END IF;
END $$;

-- profiles.role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_role') THEN
    ALTER TABLE profiles ADD CONSTRAINT chk_profiles_role
      CHECK (role IN ('customer', 'builder', 'enterprise'));
  END IF;
END $$;

-- builder_profiles.subscription_tier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscription_tier') THEN
    ALTER TABLE builder_profiles ADD CONSTRAINT chk_subscription_tier
      CHECK (subscription_tier IN ('free', 'standard', 'premium'));
  END IF;
END $$;

COMMIT;
