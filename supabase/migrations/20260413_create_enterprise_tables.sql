-- Enterprise tables: profiles, subscriptions, payments

BEGIN;

-- Enterprise profiles
CREATE TABLE IF NOT EXISTS enterprise_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT NOT NULL,
  abn TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  company_size TEXT, -- '1-10', '11-50', '51-200', '200+'
  industry_focus TEXT,
  licence_number TEXT,
  insurance_details TEXT,
  bio TEXT,
  website TEXT,
  suburb TEXT,
  postcode TEXT,
  logo_url TEXT,
  cover_photo_url TEXT,
  trades_needed TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  service_regions TEXT[] DEFAULT '{}',
  projects JSONB DEFAULT '[]',
  team_members JSONB DEFAULT '[]',
  certifications TEXT[] DEFAULT '{}',
  past_projects JSONB DEFAULT '[]',
  years_established INTEGER,
  active_projects_count INTEGER DEFAULT 0,
  team_size INTEGER,
  safety_record TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'active', 'suspended')),
  approved BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  credentials_verified JSONB DEFAULT '{}',
  has_active_subscription BOOLEAN DEFAULT FALSE,
  subscription_plan TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_profiles_user ON enterprise_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_profiles_status ON enterprise_profiles(status);

-- Enterprise subscriptions
CREATE TABLE IF NOT EXISTS enterprise_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_profile_id UUID NOT NULL REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'unlimited')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  posts_limit INTEGER NOT NULL DEFAULT 5,
  posts_used_this_cycle INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enterprise payments
CREATE TABLE IF NOT EXISTS enterprise_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_profile_id UUID NOT NULL REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'aud',
  type TEXT NOT NULL CHECK (type IN ('job_post', 'subscription')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE enterprise_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_payments ENABLE ROW LEVEL SECURITY;

-- Enterprise profiles: public read for approved, owner CRUD
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enterprise_profiles' AND policyname='enterprise_profiles_select') THEN
    CREATE POLICY enterprise_profiles_select ON enterprise_profiles FOR SELECT TO public
      USING (status IN ('active', 'approved') OR user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enterprise_profiles' AND policyname='enterprise_profiles_insert_own') THEN
    CREATE POLICY enterprise_profiles_insert_own ON enterprise_profiles FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enterprise_profiles' AND policyname='enterprise_profiles_update_own') THEN
    CREATE POLICY enterprise_profiles_update_own ON enterprise_profiles FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Enterprise subscriptions: owner read only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enterprise_subscriptions' AND policyname='enterprise_subs_select_own') THEN
    CREATE POLICY enterprise_subs_select_own ON enterprise_subscriptions FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM enterprise_profiles ep WHERE ep.id = enterprise_profile_id AND ep.user_id = auth.uid()));
  END IF;
END $$;

-- Enterprise payments: owner read only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enterprise_payments' AND policyname='enterprise_payments_select_own') THEN
    CREATE POLICY enterprise_payments_select_own ON enterprise_payments FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM enterprise_profiles ep WHERE ep.id = enterprise_profile_id AND ep.user_id = auth.uid()));
  END IF;
END $$;

-- Protect admin columns on enterprise_profiles
CREATE OR REPLACE FUNCTION protect_enterprise_profiles_admin_cols()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  ) THEN
    NEW.status := OLD.status;
    NEW.approved := OLD.approved;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.verified := OLD.verified;
    NEW.credentials_verified := OLD.credentials_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_enterprise_admin_cols_trigger ON enterprise_profiles;
CREATE TRIGGER protect_enterprise_admin_cols_trigger
  BEFORE UPDATE ON enterprise_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_enterprise_profiles_admin_cols();

-- Add poster_type to jobs table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='poster_type') THEN
    ALTER TABLE jobs ADD COLUMN poster_type TEXT DEFAULT 'customer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='workers_needed') THEN
    ALTER TABLE jobs ADD COLUMN workers_needed INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='day_rate') THEN
    ALTER TABLE jobs ADD COLUMN day_rate TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='contract_duration') THEN
    ALTER TABLE jobs ADD COLUMN contract_duration TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='start_date') THEN
    ALTER TABLE jobs ADD COLUMN start_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='site_requirements') THEN
    ALTER TABLE jobs ADD COLUMN site_requirements TEXT;
  END IF;
END $$;

-- Let enterprise users insert jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jobs' AND policyname='Enterprise can post jobs') THEN
    CREATE POLICY "Enterprise can post jobs" ON jobs FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = customer_id
        AND EXISTS (
          SELECT 1 FROM enterprise_profiles WHERE user_id = auth.uid() AND status IN ('approved', 'active')
        )
      );
  END IF;
END $$;

COMMIT;
