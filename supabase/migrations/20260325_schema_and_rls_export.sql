-- ============================================================
-- BLDESY! — Schema & RLS Policy Export
-- Generated: 2026-03-25
--
-- HOW TO POPULATE THIS FILE:
-- 1. Start Docker Desktop
-- 2. Run: npx supabase db dump --linked --schema public -f supabase/migrations/20260325_schema_and_rls_export.sql
-- 3. Review the output and commit
--
-- Alternatively, copy from Supabase Dashboard:
--   SQL Editor > run: SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public';
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────
-- profiles, builder_profiles, jobs, applications, reviews, saved_builders
-- (All created via Supabase Dashboard — schema to be exported with db dump)

-- ── RLS Policies (from SPEC.md — verify against dashboard) ──

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Expected policies:
--   SELECT: users can read own profile (auth.uid() = id)
--   UPDATE: users can update own profile (auth.uid() = id)

-- builder_profiles
ALTER TABLE public.builder_profiles ENABLE ROW LEVEL SECURITY;
-- Expected policies:
--   SELECT: anyone can read approved profiles (approved = true)
--   SELECT: builders can read own profile (auth.uid() = user_id)
--   INSERT: authenticated users can create own profile (auth.uid() = user_id)
--   UPDATE: builders can update own profile (auth.uid() = user_id)

-- jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
-- Expected policies:
--   SELECT: customers can read own jobs (auth.uid() = customer_id)
--   SELECT: builders can read open jobs (status = 'open')
--   INSERT: authenticated users can create jobs (auth.uid() = customer_id)
--   UPDATE: customers can update own jobs (auth.uid() = customer_id)

-- applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
-- Expected policies:
--   SELECT: builders can read own applications (auth.uid() = builder_id)
--   SELECT: customers can read applications on own jobs
--   INSERT: builders can create applications (auth.uid() = builder_id)
--   UPDATE: customers can update application status on own jobs

-- reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
-- Expected policies:
--   SELECT: anyone can read reviews (public)
--   INSERT: authenticated users can create reviews

-- saved_builders
ALTER TABLE public.saved_builders ENABLE ROW LEVEL SECURITY;
-- Expected policies:
--   SELECT: users can read own saved (auth.uid() = user_id)
--   INSERT: users can save builders (auth.uid() = user_id)
--   DELETE: users can unsave builders (auth.uid() = user_id)

-- ── NOTE ────────────────────────────────────────────────────
-- This file is a TEMPLATE until `supabase db dump` is run.
-- The comments above document the expected policies so they
-- can be audited against the Supabase dashboard.
-- To get the actual policies, start Docker and run the command above.
