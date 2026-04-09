-- =============================================================================
-- Security Hardening — April 2026
-- Adds admin column protection triggers and tightens RLS policies.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Protect profiles.is_admin from client-side tampering
-- =============================================================================

CREATE OR REPLACE FUNCTION protect_profiles_admin_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  ) THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profiles_admin_cols_trigger ON profiles;

CREATE TRIGGER protect_profiles_admin_cols_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profiles_admin_cols();

-- =============================================================================
-- 2. Protect builder_profiles admin-only columns
--    Protected: status, approved, approved_at, rejection_reason,
--               stripe_customer_id, stripe_subscription_id,
--               subscription_plan, subscription_status, paid_at
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
    -- Only revert columns that exist (safe with IF EXISTS pattern)
    BEGIN
      NEW.status := OLD.status;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      NEW.approved_at := OLD.approved_at;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      NEW.rejection_reason := OLD.rejection_reason;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      NEW.stripe_customer_id := OLD.stripe_customer_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      NEW.subscription_plan := OLD.subscription_plan;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      NEW.subscription_status := OLD.subscription_status;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    BEGIN
      NEW.paid_at := OLD.paid_at;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_builder_profiles_admin_cols_trigger ON builder_profiles;

CREATE TRIGGER protect_builder_profiles_admin_cols_trigger
  BEFORE UPDATE ON builder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_builder_profiles_admin_cols();

-- =============================================================================
-- 3. Ensure saved_builders has proper RLS
-- =============================================================================

ALTER TABLE saved_builders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'saved_builders' AND policyname = 'saved_builders_select_own'
  ) THEN
    CREATE POLICY saved_builders_select_own ON saved_builders
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'saved_builders' AND policyname = 'saved_builders_insert_own'
  ) THEN
    CREATE POLICY saved_builders_insert_own ON saved_builders
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'saved_builders' AND policyname = 'saved_builders_delete_own'
  ) THEN
    CREATE POLICY saved_builders_delete_own ON saved_builders
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================================================
-- 4. Ensure applications has proper UPDATE policy for status changes
-- =============================================================================

DO $$
BEGIN
  -- Job owners can update application status (accept/reject)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applications' AND policyname = 'Job owners can update application status'
  ) THEN
    CREATE POLICY "Job owners can update application status" ON applications
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM jobs
          WHERE jobs.id = applications.job_id
          AND jobs.customer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =============================================================================
-- 5. Ensure profiles has public read for names/avatars used in messaging
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_public'
  ) THEN
    CREATE POLICY profiles_select_public ON profiles
      FOR SELECT TO public
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- 6. Prevent duplicate applications (one per builder per job)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_unique_builder_job'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_unique_builder_job
      UNIQUE (job_id, builder_id);
  END IF;
END $$;

-- =============================================================================
-- 7. Prevent duplicate saved_builders entries
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saved_builders_unique_pair'
  ) THEN
    ALTER TABLE saved_builders
      ADD CONSTRAINT saved_builders_unique_pair
      UNIQUE (user_id, builder_id);
  END IF;
END $$;

COMMIT;
