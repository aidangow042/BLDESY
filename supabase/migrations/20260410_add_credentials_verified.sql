-- Add credentials_verified JSONB column to builder_profiles
ALTER TABLE builder_profiles
  ADD COLUMN IF NOT EXISTS credentials_verified JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS state TEXT;

-- Protect credentials_verified from client-side tampering
CREATE OR REPLACE FUNCTION protect_builder_credentials()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service_role can modify credentials_verified
  IF current_setting('role', true) != 'service_role' THEN
    NEW.credentials_verified := OLD.credentials_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_builder_credentials ON builder_profiles;
CREATE TRIGGER trg_protect_builder_credentials
  BEFORE UPDATE OF credentials_verified ON builder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_builder_credentials();
