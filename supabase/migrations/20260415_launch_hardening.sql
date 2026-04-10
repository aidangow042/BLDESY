-- =============================================================================
-- Launch Hardening — indexes, storage policies, rate limiting
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Missing indexes on frequently queried columns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_jobs_trade_category ON jobs(trade_category);
CREATE INDEX IF NOT EXISTS idx_jobs_suburb ON jobs(suburb);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_poster_type ON jobs(poster_type);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_builder_id ON applications(builder_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE INDEX IF NOT EXISTS idx_builder_profiles_approved ON builder_profiles(approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_builder_profiles_trade ON builder_profiles(trade_category);
CREATE INDEX IF NOT EXISTS idx_builder_profiles_suburb ON builder_profiles(suburb);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job ON reviews(job_id);

CREATE INDEX IF NOT EXISTS idx_saved_builders_user ON saved_builders(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_builders_builder ON saved_builders(builder_id);

-- =============================================================================
-- 2. Storage bucket policies
-- =============================================================================

-- builder-media: public read (profile photos are browseable), authenticated write
DO $$
BEGIN
  -- Allow public read on builder-media
  INSERT INTO storage.policies (name, bucket_id, operation, definition)
  VALUES ('Public read builder-media', 'builder-media', 'SELECT', '(true)')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN undefined_table THEN
  -- storage.policies may not exist in all Supabase versions; skip gracefully
  NULL;
END $$;

-- job-documents: private bucket — only owner and job participants can read
-- This is enforced via signed URLs in the app (storage.ts uses createSignedUrl)

-- =============================================================================
-- 3. Rate limiting function for job posting and messaging
-- =============================================================================

-- Generic rate limiter: returns TRUE if action is allowed
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count recent actions in window
  SELECT COUNT(*) INTO recent_count
  FROM rate_limit_log
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  IF recent_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  -- Log this action
  INSERT INTO rate_limit_log (user_id, action) VALUES (p_user_id, p_action);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limit log table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON rate_limit_log(user_id, action, created_at DESC);

-- Auto-cleanup old entries (older than 1 day)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log() RETURNS VOID AS $$
BEGIN
  DELETE FROM rate_limit_log WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. Enforce rate limits on job posting via trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_job_post_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- 10 jobs per day per user
  IF NOT check_rate_limit(NEW.customer_id, 'job_post', 10, 86400) THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 job posts per day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_job_post_rate_limit ON jobs;
CREATE TRIGGER trg_job_post_rate_limit
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_job_post_rate_limit();

-- =============================================================================
-- 5. Enforce rate limits on messaging via trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_message_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- 60 messages per minute per user
  IF NOT check_rate_limit(NEW.sender_id, 'message_send', 60, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded: slow down';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_message_rate_limit ON messages;
CREATE TRIGGER trg_message_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_message_rate_limit();

-- =============================================================================
-- 6. Enforce rate limits on applications via trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_application_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- 20 applications per day per builder
  IF NOT check_rate_limit(NEW.builder_id, 'job_apply', 20, 86400) THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 20 applications per day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_application_rate_limit ON applications;
CREATE TRIGGER trg_application_rate_limit
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_application_rate_limit();

COMMIT;
