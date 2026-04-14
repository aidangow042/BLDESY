-- =============================================================================
-- Fix reviews table — add reviewer_name and project_type columns
-- These are denormalised for display performance (avoids join on every read).
-- reviewer_name is populated at INSERT time from the profiles table.
-- =============================================================================

BEGIN;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS project_type TEXT;

-- Backfill existing reviews with names from profiles
UPDATE reviews
SET reviewer_name = p.name
FROM profiles p
WHERE reviews.reviewer_id = p.id
  AND reviews.reviewer_name IS NULL;

COMMIT;
