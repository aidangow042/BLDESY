--
-- PostgreSQL database dump
--

\restrict zJbFy0GSVC8XuRW42dFTeGMvzba3jv1ffdpXuRv8g4OGB3RHtlbMWCvtooBaSnU

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: get_builder_contact(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_builder_contact(p_builder_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.get_builder_contact(p_builder_id uuid) OWNER TO postgres;

--
-- Name: get_job_contact(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_job_contact(p_job_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.get_job_contact(p_job_id uuid) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'customer'), NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_job_owner(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_job_owner(p_job_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND customer_id = auth.uid());
$$;


ALTER FUNCTION public.is_job_owner(p_job_id uuid) OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    builder_id uuid,
    message text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: builder_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.builder_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    trade_category text NOT NULL,
    specialties text[],
    suburb text NOT NULL,
    postcode text NOT NULL,
    radius_km integer DEFAULT 25,
    urgency_capacity text[],
    availability text DEFAULT 'available'::text,
    bio text,
    phone text,
    website text,
    email text,
    subscription_tier text DEFAULT 'free'::text,
    approved boolean DEFAULT false,
    license_key text,
    abn text,
    created_at timestamp with time zone DEFAULT now(),
    business_name text,
    latitude double precision,
    longitude double precision,
    established_year integer,
    team_size text,
    availability_note text,
    response_time text DEFAULT 'Within 2 hours'::text,
    areas_serviced text,
    cover_photo_url text,
    profile_photo_url text,
    projects jsonb,
    credentials jsonb,
    faqs jsonb,
    team_members jsonb,
    CONSTRAINT chk_abn_format CHECK (((abn IS NULL) OR (abn ~ '^\d{11}$'::text))),
    CONSTRAINT chk_bio_length CHECK (((bio IS NULL) OR (length(bio) <= 2000))),
    CONSTRAINT chk_business_name_length CHECK (((length(business_name) >= 1) AND (length(business_name) <= 200))),
    CONSTRAINT chk_phone_format CHECK (((phone IS NULL) OR (phone ~ '^\+?[0-9\s\-()]{6,20}$'::text))),
    CONSTRAINT chk_postcode_format CHECK ((postcode ~ '^\d{4}$'::text)),
    CONSTRAINT chk_radius_km_range CHECK (((radius_km IS NULL) OR ((radius_km > 0) AND (radius_km <= 500)))),
    CONSTRAINT chk_suburb_length CHECK (((length(suburb) >= 1) AND (length(suburb) <= 100)))
);


ALTER TABLE public.builder_profiles OWNER TO postgres;

--
-- Name: job_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size_bytes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.job_documents OWNER TO postgres;

--
-- Name: job_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    file_path text NOT NULL,
    is_cover boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.job_photos OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    title text NOT NULL,
    description text,
    trade_category text NOT NULL,
    urgency text NOT NULL,
    budget text,
    suburb text NOT NULL,
    postcode text NOT NULL,
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now(),
    contact_phone text,
    contact_email text,
    CONSTRAINT chk_budget_positive CHECK (((budget IS NULL) OR (length(budget) > 0))),
    CONSTRAINT chk_contact_phone_format CHECK (((contact_phone IS NULL) OR (contact_phone ~ '^\+?[0-9\s\-()]{6,20}$'::text))),
    CONSTRAINT chk_job_description_length CHECK (((description IS NULL) OR (length(description) <= 5000))),
    CONSTRAINT chk_job_title_length CHECK (((length(title) >= 1) AND (length(title) <= 200)))
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role text DEFAULT 'customer'::text NOT NULL,
    name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    phone text
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    reviewer_id uuid,
    reviewee_id uuid,
    rating integer,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_rating_range CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT chk_review_comment_length CHECK (((comment IS NULL) OR (length(comment) <= 2000))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: saved_builders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_builders (
    user_id uuid NOT NULL,
    builder_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.saved_builders OWNER TO postgres;

--
-- Name: applications applications_job_id_builder_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_builder_id_key UNIQUE (job_id, builder_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: builder_profiles builder_profiles_license_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builder_profiles
    ADD CONSTRAINT builder_profiles_license_key_key UNIQUE (license_key);


--
-- Name: builder_profiles builder_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builder_profiles
    ADD CONSTRAINT builder_profiles_pkey PRIMARY KEY (id);


--
-- Name: job_documents job_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_documents
    ADD CONSTRAINT job_documents_pkey PRIMARY KEY (id);


--
-- Name: job_photos job_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_photos
    ADD CONSTRAINT job_photos_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: saved_builders saved_builders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_builders
    ADD CONSTRAINT saved_builders_pkey PRIMARY KEY (user_id, builder_id);


--
-- Name: applications_builder_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX applications_builder_id_idx ON public.applications USING btree (builder_id);


--
-- Name: applications_job_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX applications_job_id_idx ON public.applications USING btree (job_id);


--
-- Name: builder_profiles_postcode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builder_profiles_postcode_idx ON public.builder_profiles USING btree (postcode);


--
-- Name: builder_profiles_trade_category_approved_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builder_profiles_trade_category_approved_idx ON public.builder_profiles USING btree (trade_category, approved);


--
-- Name: jobs_trade_category_status_urgency_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_trade_category_status_urgency_idx ON public.jobs USING btree (trade_category, status, urgency);


--
-- Name: applications applications_builder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_builder_id_fkey FOREIGN KEY (builder_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: builder_profiles builder_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builder_profiles
    ADD CONSTRAINT builder_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: job_documents job_documents_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_documents
    ADD CONSTRAINT job_documents_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: job_photos job_photos_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_photos
    ADD CONSTRAINT job_photos_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: reviews reviews_reviewee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES auth.users(id);


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id);


--
-- Name: saved_builders saved_builders_builder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_builders
    ADD CONSTRAINT saved_builders_builder_id_fkey FOREIGN KEY (builder_id) REFERENCES public.builder_profiles(id) ON DELETE CASCADE;


--
-- Name: saved_builders saved_builders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_builders
    ADD CONSTRAINT saved_builders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews Anyone can read reviews; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);


--
-- Name: jobs Approved builders can view open jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Approved builders can view open jobs" ON public.jobs FOR SELECT USING (((status = 'open'::text) AND (EXISTS ( SELECT 1
   FROM public.builder_profiles
  WHERE ((builder_profiles.user_id = auth.uid()) AND (builder_profiles.approved = true))))));


--
-- Name: applications Builders can apply to jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Builders can apply to jobs" ON public.applications FOR INSERT WITH CHECK (((auth.uid() = builder_id) AND (EXISTS ( SELECT 1
   FROM public.builder_profiles
  WHERE ((builder_profiles.user_id = auth.uid()) AND (builder_profiles.approved = true))))));


--
-- Name: builder_profiles Builders can delete own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Builders can delete own profile" ON public.builder_profiles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: builder_profiles Builders can insert own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Builders can insert own profile" ON public.builder_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: builder_profiles Builders can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Builders can update own profile" ON public.builder_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: applications Builders see own applications; customers see applications on th; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Builders see own applications; customers see applications on th" ON public.applications FOR SELECT USING (((auth.uid() = builder_id) OR (auth.uid() = ( SELECT jobs.customer_id
   FROM public.jobs
  WHERE (jobs.id = applications.job_id)))));


--
-- Name: jobs Customers can create jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Customers can create jobs" ON public.jobs FOR INSERT WITH CHECK ((auth.uid() = customer_id));


--
-- Name: jobs Customers can delete own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Customers can delete own jobs" ON public.jobs FOR DELETE USING ((auth.uid() = customer_id));


--
-- Name: reviews Customers can review builders on accepted jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Customers can review builders on accepted jobs" ON public.reviews FOR INSERT WITH CHECK (((auth.uid() = reviewer_id) AND (EXISTS ( SELECT 1
   FROM (public.applications a
     JOIN public.jobs j ON ((j.id = a.job_id)))
  WHERE ((a.builder_id = reviews.reviewee_id) AND (j.customer_id = auth.uid()) AND (a.status = 'accepted'::text))))));


--
-- Name: applications Customers can update application status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Customers can update application status" ON public.applications FOR UPDATE USING ((auth.uid() = ( SELECT jobs.customer_id
   FROM public.jobs
  WHERE (jobs.id = applications.job_id))));


--
-- Name: jobs Customers can update own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Customers can update own jobs" ON public.jobs FOR UPDATE USING ((auth.uid() = customer_id));


--
-- Name: jobs Customers can view their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Customers can view their own jobs" ON public.jobs FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: builder_profiles Public can view approved builders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view approved builders" ON public.builder_profiles FOR SELECT USING (((approved = true) OR (auth.uid() = user_id)));


--
-- Name: reviews Reviews are public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);


--
-- Name: jobs Users can delete their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own jobs" ON public.jobs FOR DELETE USING ((customer_id = auth.uid()));


--
-- Name: job_documents Users can insert documents for their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert documents for their own jobs" ON public.job_documents FOR INSERT WITH CHECK (public.is_job_owner(job_id));


--
-- Name: job_photos Users can insert photos for their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert photos for their own jobs" ON public.job_photos FOR INSERT WITH CHECK (public.is_job_owner(job_id));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: jobs Users can update their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own jobs" ON public.jobs FOR UPDATE USING ((customer_id = auth.uid())) WITH CHECK ((customer_id = auth.uid()));


--
-- Name: job_documents Users can view job documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view job documents" ON public.job_documents FOR SELECT USING ((public.is_job_owner(job_id) OR (EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = job_documents.job_id) AND (jobs.status = 'open'::text) AND (EXISTS ( SELECT 1
           FROM public.builder_profiles
          WHERE ((builder_profiles.user_id = auth.uid()) AND (builder_profiles.approved = true)))))))));


--
-- Name: job_photos Users can view job photos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view job photos" ON public.job_photos FOR SELECT USING ((public.is_job_owner(job_id) OR (EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = job_photos.job_id) AND (jobs.status = 'open'::text) AND (EXISTS ( SELECT 1
           FROM public.builder_profiles
          WHERE ((builder_profiles.user_id = auth.uid()) AND (builder_profiles.approved = true)))))))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: saved_builders Users manage own saved builders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own saved builders" ON public.saved_builders USING ((auth.uid() = user_id));


--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: builder_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.builder_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: job_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.job_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: job_photos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_builders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.saved_builders ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION get_builder_contact(p_builder_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_builder_contact(p_builder_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_builder_contact(p_builder_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_builder_contact(p_builder_id uuid) TO service_role;


--
-- Name: FUNCTION get_job_contact(p_job_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_job_contact(p_job_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_job_contact(p_job_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_job_contact(p_job_id uuid) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_job_owner(p_job_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_job_owner(p_job_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_job_owner(p_job_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_job_owner(p_job_id uuid) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: TABLE applications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.applications TO anon;
GRANT ALL ON TABLE public.applications TO authenticated;
GRANT ALL ON TABLE public.applications TO service_role;


--
-- Name: TABLE builder_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.builder_profiles TO anon;
GRANT ALL ON TABLE public.builder_profiles TO authenticated;
GRANT ALL ON TABLE public.builder_profiles TO service_role;


--
-- Name: TABLE job_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_documents TO anon;
GRANT ALL ON TABLE public.job_documents TO authenticated;
GRANT ALL ON TABLE public.job_documents TO service_role;


--
-- Name: TABLE job_photos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.job_photos TO anon;
GRANT ALL ON TABLE public.job_photos TO authenticated;
GRANT ALL ON TABLE public.job_photos TO service_role;


--
-- Name: TABLE jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.jobs TO anon;
GRANT ALL ON TABLE public.jobs TO authenticated;
GRANT ALL ON TABLE public.jobs TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reviews TO anon;
GRANT ALL ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;


--
-- Name: TABLE saved_builders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.saved_builders TO anon;
GRANT ALL ON TABLE public.saved_builders TO authenticated;
GRANT ALL ON TABLE public.saved_builders TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict zJbFy0GSVC8XuRW42dFTeGMvzba3jv1ffdpXuRv8g4OGB3RHtlbMWCvtooBaSnU

