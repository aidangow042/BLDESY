# BLDEASY — Implementation Spec

A smart connection platform matching customers with builders/trades based on urgency, job type, and location. Not a quote site, booking platform, or pay-to-win marketplace — purely a connector.

**Core flow:** Customer searches/posts job → Builders view → Builder applies → Customer accepts → Review

**Two roles, one app.** App opens in Customer Mode. Builder Portal is conditional on account type.

---

## Phase 0 — Product Clarity ✅
- [x] MVP feature list defined (this document)
- [x] Two roles defined: Customer vs Builder
- [x] Core flow defined

---

## Phase 1 — Supabase Backend Foundation

### 1.1 Create Supabase Project
- [ ] Create account + project at supabase.com
- [ ] Select region: **ap-southeast-2 (Sydney)**
- [ ] Copy Project URL + anon key from Settings → API
- [ ] Save to `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 1.2 Database Schema

> **Pattern:** Use a `profiles` table that extends Supabase's built-in `auth.users` — do NOT create a separate `users` table. This works seamlessly with `auth.uid()` in RLS policies.

**`profiles`** (extends `auth.users`)
```sql
id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
role          text NOT NULL DEFAULT 'customer' -- 'customer' | 'builder'
name          text
avatar_url    text
created_at    timestamptz DEFAULT now()
```
> Trigger: auto-insert a `profiles` row on new `auth.users` signup.

**`builder_profiles`**
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE
trade_category    text NOT NULL           -- 'plumber' | 'electrician' | 'builder' etc
specialties       text[]                  -- ['heritage homes', 'commercial fit-outs']
suburb            text NOT NULL           -- e.g. "Surry Hills"
postcode          text NOT NULL           -- e.g. "2010"
radius_km         integer DEFAULT 25
urgency_capacity  text[]                  -- ['emergency', 'soon', 'planned']
availability      text DEFAULT 'available' -- 'available' | 'limited' | 'unavailable'
bio               text
phone             text
website           text
email             text
subscription_tier text DEFAULT 'free'     -- 'free' | 'foundation' | 'standard'
approved          boolean DEFAULT false
license_key       text UNIQUE
abn               text
created_at        timestamptz DEFAULT now()
```

**`jobs`**
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
customer_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE
title            text NOT NULL
description      text
trade_category   text NOT NULL
urgency          text NOT NULL   -- 'emergency' | 'soon' | 'planned'
budget           text            -- free text, not binding
suburb           text NOT NULL
postcode         text NOT NULL
status           text DEFAULT 'open'  -- 'open' | 'assigned' | 'closed'
created_at       timestamptz DEFAULT now()
```

**`applications`**
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
job_id       uuid REFERENCES jobs(id) ON DELETE CASCADE
builder_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE
message      text
status       text DEFAULT 'pending'  -- 'pending' | 'accepted' | 'rejected'
created_at   timestamptz DEFAULT now()
UNIQUE(job_id, builder_id)           -- one application per builder per job
```

**`reviews`**
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
job_id        uuid REFERENCES jobs(id)
reviewer_id   uuid REFERENCES auth.users(id)
reviewee_id   uuid REFERENCES auth.users(id)
rating        integer CHECK (rating BETWEEN 1 AND 5)
comment       text
created_at    timestamptz DEFAULT now()
```

**Indexes to add:**
- `jobs(trade_category, status, urgency)` — for search queries
- `builder_profiles(trade_category, approved)` — for matching
- `builder_profiles(postcode)` — for location filtering
- `applications(job_id)`, `applications(builder_id)`

> **Location note:** Store suburb + postcode as plain text for MVP. PostGIS (coordinate-based radius queries) is a post-MVP upgrade once smart matching is needed.

### 1.3 Authentication
- [ ] Enable email/password auth in Supabase dashboard
- [ ] Enable email verification
- [ ] Enable password reset emails
- [ ] Create trigger: auto-insert `profiles` row on new signup (use `handle_new_user` function)
- [ ] (Post-MVP) Social login — Google, Apple

### 1.4 Row Level Security (RLS) — Mandatory

Enable RLS on all tables. All policies use `auth.uid()` to identify the current user.

**`profiles`**
- SELECT: own row only
- UPDATE: own row only

**`builder_profiles`**
- SELECT: public read for `approved = true`; own row always
- INSERT/UPDATE/DELETE: own row only

**`jobs`**
- SELECT: customers see own jobs; builders see all `status = 'open'` jobs
- INSERT: customers only
- UPDATE: own job only (customer)
- DELETE: own job only (customer)

**`applications`**
- SELECT: builder sees own applications; customer sees applications on their jobs
- INSERT: builders only; enforced one-per-job by UNIQUE constraint
- UPDATE: customer can update `status`; builder cannot

**`reviews`**
- INSERT: only after `jobs.status = 'closed'`; reviewer must be party to the job
- SELECT: public

### 1.5 Storage Buckets
- [ ] `builder-photos` — public read, authenticated write (own folder only)
- [ ] `license-docs` — private; builder write own, admin read
- [ ] `job-photos` — public read, authenticated write

---

## Phase 2 — Frontend Foundation

### 2.1 Install Dependencies
```bash
npx expo install @supabase/supabase-js react-native-url-polyfill expo-secure-store
```

Create `lib/supabase.ts` — initialise client with AsyncStorage/SecureStore session persistence.

### 2.2 Auth Screens
- [ ] `app/(auth)/login.tsx` — email + password
- [ ] `app/(auth)/signup.tsx` — email + password + name + role selection (customer/builder)
- [ ] `app/(auth)/forgot-password.tsx`
- [ ] `app/(auth)/_layout.tsx` — stack layout for auth group

### 2.3 Session Handling + Role Routing
Root layout (`app/_layout.tsx`) checks session on mount:

| State | Route |
|---|---|
| No session | `/(auth)/login` |
| No session (guest) | `/(tabs)/` — browse only, sign-up prompt on contact/save/post |
| Session, role = customer | `/(tabs)/` |
| Session, role = builder, approved = true | `/(tabs)/` (with builder portal unlocked) |
| Session, role = builder, approved = false | `/pending-approval` |

> **Guest browsing:** Unauthenticated users can search and view builder profiles freely. Sign-up is required to: post a job, contact a builder, or save a profile.

### 2.4 Top-Left Menu (Drawer/Modal)
Accessible from header icon on all main screens:
1. Account — personal details
2. Settings — privacy, notifications, language
3. Help & Support — contact, FAQ, how the app works
4. Legal — T&C, privacy policy, disclaimer
5. Builder Portal — conditional (sign-up CTA or dashboard link)

---

## Phase 3 — MVP Features

> Build customer flow first — it creates the supply that makes builder sign-up valuable.

### 3.1 Customer Flow

**Home / Search** (`app/(tabs)/index.tsx`)
- [ ] Search bar at top — keyword input (e.g. "emergency plumber", "bathroom reno")
- [ ] Category grid — Builder, Plumber, Electrician, Removalist, Painter, Carpenter, Landscaper, Tiler, HVAC
- [ ] Tapping a category expands subcategories
- [ ] Urgency filter chips: Emergency (24–48h) · Soon (1–2 weeks) · Planned (1–6 months)
- [ ] Location: suburb or postcode text input (manual entry, no GPS required at MVP)

**Results Page** (`app/results.tsx`)
- [ ] List of matched builder profiles
- [ ] Ranked by: job relevance → urgency match → location proximity → availability
- [ ] No sponsored rankings — payment never affects position
- [ ] Each card: company name, trade tags, distance, availability status
- [ ] Save/like button on each card

**Builder Profile View** (`app/builder/[id].tsx`)
- [ ] Company name header
- [ ] Photo gallery (past work)
- [ ] Job tags ("Emergency Plumber", "All materials stocked", "Available now")
- [ ] About / services / certifications sections
- [ ] Availability status badge (Available / Limited / Not looking)
- [ ] Optional availability calendar (view-only — no booking)
- [ ] Contact box: phone, email, website, in-app message (post-MVP)

**Post a Job** (`app/post-job.tsx`)
- [ ] Form: title, description, trade category, urgency, budget (optional), location
- [ ] Submit → insert to `jobs` table
- [ ] Confirmation screen

**My Jobs** (`app/my-jobs.tsx`)
- [ ] List of own jobs with status badges
- [ ] Tap job → view applicants
- [ ] Accept/reject applicant buttons

**Saved Tab** (`app/(tabs)/saved.tsx`)
- [ ] Saved builder profiles (MVP — `saved_builders` join table: `user_id`, `builder_id`)
- [ ] Search history / draft searches — post-MVP

### 3.2 AI Assist Tab (`app/(tabs)/ai.tsx`)
- [ ] Chat interface
- [ ] System prompt: trade identification, urgency classification, rough cost guidance (non-binding)
- [ ] Model: **`claude-haiku-4-5-20251001`** — cheapest Claude model, ~fraction of a cent per exchange
- [ ] API call routed through a **Supabase Edge Function** (`supabase/functions/ai-assist/`) — never expose API key in client
- [ ] Edge Function calls Anthropic API with the user's message + system prompt
- [ ] AI response includes a "Search for [trade]" CTA that links to results
- [ ] Disclaimer shown at top: "AI does not provide binding quotes or act as a contractor"

### 3.3 Builder Flow

**Builder Sign-Up / Onboarding**
- [ ] `app/builder-signup.tsx` — multi-step form:
  - Step 1: Trade category + specialties + location + radius
  - Step 2: Upload licence, certificates, ABN (to `license-docs` bucket)
  - Step 3: Contact details + bio
- [ ] Submit → create `builder_profiles` row with `approved = false`
- [ ] Show pending approval screen

**Pending Approval Screen** (`app/pending-approval.tsx`)
- [ ] "Your application is under review" message
- [ ] Expected timeframe
- [ ] Contact support link

**Builder Approval**
- [ ] **MVP:** Admin manually sets `approved = true` via Supabase dashboard
- [ ] **Phase 4+:** Approval triggers automatically on first successful Stripe payment
- [ ] Once approved: `license_key` generated (uuid), builder notified by email
- [ ] Builder Portal tab unlocks → Builder Dashboard

**Jobs Feed** (`app/builder/jobs.tsx`)
- [ ] Browse open jobs filtered by trade category + location radius
- [ ] Filter by urgency
- [ ] Tap job → job detail screen

**Job Detail + Apply** (`app/builder/job/[id].tsx`)
- [ ] Job description, urgency, budget, location
- [ ] "Apply" button → insert to `applications` table with optional message

**My Applications** (`app/builder/applications.tsx`)
- [ ] List with status: pending / accepted / rejected

**Availability Toggle** (in builder profile editor)
- [ ] Available / Limited / Not looking for work

### 3.4 Builder Dashboard (`app/(tabs)/portal.tsx` — when approved)
- [ ] Analytics: profile views, contact clicks (tracked client-side → stored in Supabase)
- [ ] Profile editor: descriptions, photos, specialties, availability
- [ ] AI Insights: (post-MVP) surface what drives traffic
- [ ] Settings: subscription status, billing, plan changes, support, FAQ

### 3.5 Acceptance + Status Logic
When customer accepts a builder:
- [ ] `applications.status` → `accepted` for accepted applicant
- [ ] `applications.status` → `rejected` for all others
- [ ] `jobs.status` → `assigned`
- [ ] Both parties see updated state

### 3.6 Reviews
Triggered after `jobs.status = 'closed'`:
- [ ] Customer prompted to leave review for builder (1–5 stars + comment)
- [ ] Insert to `reviews` table
- [ ] Recalculate builder's average rating on `builder_profiles`

---

## Phase 4 — Payments

**Trigger to activate:** 2,000 registered users OR 100 searches/week (whichever first).

- [ ] Integrate Stripe (via Expo / server-side webhook)
- [ ] Subscription tiers:
  - Foundation members (early adopters): $29/month
  - New builders: $49/month
- [ ] `builder_profiles.subscription_tier` updated on payment
- [ ] **Payment never affects search ranking or visibility**
- [ ] Billing management in Builder Dashboard → Settings

---

## Phase 5 — Cloud & Deployment

### 5.1 App Distribution
- [ ] Build iOS binary → TestFlight (internal testing)
- [ ] Build Android APK → internal track (Google Play Console)
- [ ] Fix device-specific bugs

### 5.2 Domain + Landing Page
- [ ] Buy domain (bldeasy.com.au or similar)
- [ ] Simple landing page: what it is, join waitlist, contact

### 5.3 Analytics
Track events in Supabase (or PostHog/Mixpanel):
- [ ] `job_posted`
- [ ] `search_performed`
- [ ] `builder_profile_viewed`
- [ ] `contact_clicked`
- [ ] `application_submitted`
- [ ] `application_accepted`

### 5.4 Error Monitoring
- [ ] Integrate Sentry (`@sentry/react-native`) for crash reports

---

## Phase 6 — Post-MVP Upgrades

Only after MVP is stable and in users' hands.

- [ ] Smart matching algorithm (location + trade + availability scoring)
- [ ] Real-time messaging (Supabase Realtime channels)
- [ ] Licence/ABN verification integration
- [ ] Admin dashboard (moderation, disputes, approvals)
- [ ] Push notifications (Expo Notifications)
- [ ] Verified review badges
- [ ] Job tracking
- [ ] Availability calendars (builder-managed)
- [ ] AI for builders: draft replies, job suitability scoring, profile optimisation tips

---

## App Layout Reference

**Bottom Navigation (always visible)**
1. Home / Search
2. AI Assist
3. Saved
4. Profile (Customer) / Dashboard (Builder)

**Top-Left Menu**
- Account · Settings · Help & Support · Legal · Builder Portal

**Top-Right**
- Switch to Builder Mode / Switch to Customer Mode

**Key UX Rules**
- Rankings are algorithmic only — payment never affects placement
- No booking, quoting, or messaging at MVP
- AI is a translator, not a contractor — never provides binding quotes
- Builder Portal tab content is conditional on account type and approval status
- One account, two modes

---

## Trade Categories (MVP)

Main: Builder · Plumber · Electrician · Removalist · Painter · Carpenter · Landscaper · Tiler · HVAC / Air Conditioning

Subcategory examples:
- Plumber → Emergency Plumbing · Gas Fitting · Drainage · Hot Water
- Electrician → Residential · Commercial · Solar · Emergency
- Builder → Renovations · Extensions · New Builds · Heritage

---

## Current Codebase State

| Area | Status |
|---|---|
| Expo Router skeleton | ✅ Done |
| 4-tab navigation | ✅ Done |
| Theme system (light/dark) | ✅ Done |
| Supabase connection | ❌ Not started |
| Auth | ❌ Not started |
| Any real screens | ❌ Not started |
