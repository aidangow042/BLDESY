# BLDESY App ↔ Website Parity Handoff

**Drop this into a fresh Claude Code session opened in `~/myApp`.**
**Author:** Aidan, 2026-05-28. **Goal:** bring mobile app to feature parity with the website at `~/bldesy-web` ahead of launch.

This file is the single source of truth for the parity push. It tells the next session what to build, what already exists on the website to copy from, and the order to ship in.

---

## 0. Context (read first)

- BLDESY = Australian trade marketplace. Two surfaces share one Supabase backend:
  - **Website** (`~/bldesy-web`, Next.js App Router, Tailwind v4) — recently launched, feature-complete, security-audited.
  - **App** (`~/myApp`, Expo/React Native, custom `constants/theme`) — behind by ~one product tier.
- Backend is the same Supabase project. **Every API route on the website is callable from the app over HTTPS.** Don't re-implement server logic in the app — call the existing endpoint.
- The app talks to Supabase directly with the **anon key** today. The website talks to Supabase via server actions / API routes. App security = whatever RLS policies allow. Treat RLS as load-bearing.
- Aidan prefers Australian English, direct terminal commands, concise responses.

### Confirmed working in app today
- Auth (login, signup, forgot-password) — but legacy flow, no Turnstile, no unified profile
- Job posting + my-jobs + job-detail screens
- Messaging (conversation list + view + send), no attachments
- Builder profile + edit + applications + analytics screens
- Enterprise signup/dashboard/jobs/billing/settings (billing is MOCKED)
- Search results + filters, map (`react-native-maps` — keep as-is, not Leaflet)
- AI tab, notification bell + panel UI, side-drawer nav
- Settings, edit-profile, all-trades, builder-jobs

### Confirmed broken / lying
- **Delete-account in `app/settings.tsx` is a UI lie** — it shows a destructive confirm dialog then calls `signOut()`. Nothing is deleted. **Privacy policy + App Store violation.** Fix first.
- **`billing.tsx` is fully mocked** — hardcoded Visa 4242, fake invoices. No Stripe SDK installed.
- **`subscribe.tsx` offers a single "$49 Pro"** — the website now has 4 tradie tiers + 3 enterprise tiers.

---

## 1. Order of execution (recommended)

| # | Item | Why first | Est |
|---|---|---|---|
| 1 | Real delete-account | Legal + App Store blocker | 2 hrs |
| 2 | Terminology rename sweep | Cheap, unblocks copy reviews | 2 hrs |
| 3 | Pricing v1 + tier checkout + PaymentGate | Revenue model is wrong without this | 3–5 days |
| 4 | Unified profile / `/welcome` role picker | Onboarding parity, blocks the rest | 2 days |
| 5 | Notifications v2 + Expo push registration | Engagement | 1–2 days |
| 6 | Insurance Verifier v2 verdict UI | Trust signal for hirers | 1 day |
| 7 | Security UI (Turnstile, password reconfirm, generic errors) | Hardening | 1 day |
| 8 | Header refresh + tier-aware billing chip | Polish | 0.5 day |

**Total ≈ 8–12 working days.**

---

## 2. Item-by-item briefs

### Item 1 — Real delete-account (2 hrs)

**Current state:** `app/settings.tsx` — destructive button only signs out.

**Website reference:** `~/bldesy-web/app/api/auth/delete-account/route.ts`
- Expects `POST { password: string }` from an authenticated session.
- Re-verifies password by calling `signInWithPassword` on a service-role client.
- Rate-limited.
- Deletes the auth user (which cascades to all owned rows via FK).

**Build:**
1. Replace the fake handler with a modal prompting for password.
2. Submit to the production website's endpoint: `https://bldesy.com.au/api/auth/delete-account` (or whatever the prod URL is — check `eas.json` for env config). Pass the Supabase session's access token in `Authorization: Bearer …` so the Next.js route sees the same auth context.
3. On 200 OK, call `supabase.auth.signOut()` locally and navigate to `/login`.
4. Handle 401 (wrong password — show inline error) and 429 (rate-limited).

**Test:** create a throwaway account, delete it, confirm it's gone in Supabase Studio Auth → Users.

---

### Item 2 — Terminology rename (2 hrs)

The website did a global rename. The app still uses the old words. **Old → New:**
- "Commercial" → **"Project Jobs"** (in customer-facing job-type contexts only — not "Commercial Tier" in pricing, which stays)
- "Residential" → **"Home Jobs"**
- "For Companies" → **"For Builders"**

**Files likely affected** (grep first, don't blind-replace):
- `app/(auth)/signup.tsx`
- `app/post-job.tsx`
- `app/job-detail.tsx`
- `app/my-jobs.tsx`
- `app/builder-edit-profile.tsx`
- `app/builder-jobs.tsx`
- `app/subscribe.tsx`
- `app/enterprise-*.tsx`
- `app/(tabs)/portal.tsx`

**Don't** rename DB columns or job_type enum values — purely UI strings.

---

### Item 3 — Pricing v1 + tier checkout + PaymentGate (3–5 days)

**Biggest piece of work.** App is on single "$49 Pro" in `app/subscribe.tsx`. Website has 4 tradie tiers + 3 enterprise tiers with monthly/annual + embedded Stripe Checkout.

**Website references:**
- Tier definitions: `~/bldesy-web/lib/pricing-tiers-client.ts` — exports `TRADIE_TIERS`, `ENTERPRISE_TIERS`, `pickTierForTrades(trades)`, `TradieTierKey`, `EnterpriseTierKey`, `BillingInterval`. **Copy this file verbatim into `~/myApp/lib/` — it's client-safe with no env access.**
- Stripe price ID map: `~/bldesy-web/lib/pricing-tiers.ts` (server-only). App doesn't need this; the website's checkout endpoint resolves IDs server-side.
- Pricing page: `~/bldesy-web/app/pricing/pricing-page-client.tsx` (visual reference for the tier cards)
- Plan picker (post-signup): `~/bldesy-web/components/billing/plan-picker.tsx`
- PaymentGate (blocks application without active sub): `~/bldesy-web/components/enterprise/payment-gate.tsx`
- Tradie checkout endpoint: `~/bldesy-web/app/api/stripe/tier-checkout/route.ts`
- Enterprise checkout endpoint: `~/bldesy-web/app/api/stripe/enterprise-checkout/route.ts`
- Cancel / resume / swap endpoints: `~/bldesy-web/app/api/stripe/{cancel,resume-subscription,swap-plan,enterprise-cancel,enterprise-resume,enterprise-swap-tier}/route.ts`
- Subscription state endpoints: `~/bldesy-web/app/api/stripe/{billing-details,enterprise-subscription-state}/route.ts`

**Build approach (recommended):**
1. `npm install @stripe/stripe-react-native` (Stripe's official RN SDK with PaymentSheet).
2. Wrap root with `<StripeProvider publishableKey={PK}>`.
3. Rewrite `app/subscribe.tsx` to show the 4 tradie tier cards + monthly/annual toggle.
4. On tap, call `POST https://bldesy.com.au/api/stripe/tier-checkout` with `{ tier, interval }` + Bearer token → returns `{ client_secret }`.
5. Open Stripe PaymentSheet with that client secret. (Use Mobile PaymentSheet, not Embedded — Embedded is web-only.)
6. On success, refetch subscription state and navigate to dashboard.
7. Rewrite `app/billing.tsx` to fetch real data from `/api/stripe/billing-details` and offer cancel/resume/swap via the existing endpoints.
8. Build a `PaymentGate` wrapper in `components/PaymentGate.tsx` that checks subscription state and shows an upgrade prompt if missing. Wrap the apply-to-job button.
9. Repeat for enterprise screens using `enterprise-checkout` + `enterprise-*` endpoints.

**Gotcha:** website uses Stripe **Embedded** Checkout (web-only). On native, use **PaymentSheet** instead — same payment intent flow, different surface. Both end up creating the same subscription via the same backend endpoint, so the rest of the stack doesn't care.

**Test:** Stripe test mode card `4242 4242 4242 4242`, any future expiry, any CVC. Verify subscription row appears in `subscriptions` / `enterprise_subscriptions` table and the webhook fires (check `webhook_events` table for the dedup row).

---

### Item 4 — Unified profile + `/welcome` role picker (2 days)

**Concept:** the website moved to "one account, additive roles." A user signs up once, then picks roles (Customer / Builder / Enterprise) at `/welcome`. A role exists if its extension table row exists (`builder_profiles`, `enterprise_profiles`).

**App currently:** signup forks into separate `builder-signup` and `enterprise-signup` flows from the start.

**Website references:**
- `~/bldesy-web/app/welcome/page.tsx` + `welcome-cards.tsx`
- `~/bldesy-web/lib/actions/auth.ts` (role activation server actions)
- Memory: `project_unified_profile.md`

**Build:**
1. Simplify `app/(auth)/signup.tsx` to one form (email, password, name) — no role choice up front.
2. After confirm-email, route to new `app/welcome.tsx` showing 3 role cards.
3. Tapping a card calls a server action / endpoint to insert the extension row (use existing website endpoints — don't duplicate).
4. After Builder/Enterprise selected, run the trade picker → `pickTierForTrades(trades)` → route to `/subscribe` pre-selected to that tier (PlanPicker pattern).

---

### Item 5 — Notifications v2 + Expo push (1–2 days)

**Current state:** `notification-bell.tsx` and `notifications-panel.tsx` exist (in-app inbox UI). **`expo-notifications` is not installed.** Push doesn't work.

**Website references:**
- Unified dispatcher: `~/bldesy-web/lib/notifications/dispatch.ts` — `dispatchNotification()` is THE entry point. Handles in-app insert + Resend email + Expo Push.
- Push token registration: `~/bldesy-web/lib/push/` (server-side store)
- Signed unsubscribe: `~/bldesy-web/lib/notifications/unsubscribe-token.ts`
- Triggers: `~/bldesy-web/lib/notifications/triggers.ts`
- Memory: `project_notifications_v2.md`

**Build:**
1. `npx expo install expo-notifications expo-device`
2. Add iOS push entitlement and Android FCM config in `app.json`.
3. On login (or first launch), request push permission, fetch Expo push token, POST to a website endpoint that upserts it into a `push_tokens` table keyed by `user_id` + `device_id`. **Check if `/api/push/register` already exists on the website; if not, add it there, not in the app.**
4. Hook the local `notifications-panel` to the same `notifications` table the dispatcher writes to. It probably already reads from there — verify.
5. Add notification preferences UI in `settings.tsx` (email opt-out, push opt-out toggles writing to `profiles.notification_prefs` JSONB or similar — check website schema).

**Gotcha:** Expo push only works on physical devices, not simulator. EAS build required for prod APNs.

---

### Item 6 — Insurance Verifier v2 verdict UI (1 day)

**Website references:**
- Verdict logic: `~/bldesy-web/lib/insurance-checks.ts`
- Known insurers allowlist: `~/bldesy-web/lib/known-insurers.ts`
- Cron: `~/bldesy-web/app/api/cron/insurance-expiry/route.ts`
- Memory: `project_insurance_v2.md`

**Verdict shape:** `PASS | REVIEW | FAIL` + an array of `checks` (each with name, status, detail). All stored in `builder_profiles.insurance_jsonb` (or similar JSONB column — confirm).

**Build in app:**
1. In `app/builder-profile.tsx` and `app/builder-edit-profile.tsx`, render a verdict pill (green/amber/red) and the checks list below.
2. In `app/credential-badges.tsx`, surface insurer name + expiry date + "expiring soon" warning if `<30 days`.
3. Reuse the website's status copy verbatim for consistency.

**No new backend work** — verdict is computed server-side already.

---

### Item 7 — Security UI (1 day)

**Three small things:**

1. **Turnstile CAPTCHA on signup/login**
   - Website uses `~/bldesy-web/components/auth/turnstile-widget.tsx`.
   - On RN, use `react-native-turnstile` or `react-native-webview` with the Turnstile iframe. Pass the token to your signup/login endpoint.
   - Less critical for native (App Store gates bots) but website endpoint may require the token.

2. **Password reconfirm before destructive actions**
   - Already covered by Item 1 (delete-account modal). Reuse same modal pattern for "Cancel subscription" if desired.

3. **Generic auth error messages**
   - Sweep `app/(auth)/login.tsx` and `signup.tsx` for any `error.message` rendered directly. Replace with generic "Email or password incorrect" / "Could not sign you up" copy.

---

### Item 8 — Header refresh + tier-aware billing (0.5 day)

**Website:** added a tier chip in the header showing current plan + "Manage" link.
**App:** `side-drawer.tsx` + `page-header.tsx` predate this.

**Build:** add a tier badge to the drawer profile section using `lib/billing.ts` or whatever helper the app uses to read current subscription state. Link tap → `app/billing.tsx`.

---

## 3. Gotchas + memory worth carrying forward

- **Turbopack dev breaks RN over LAN on iOS** (memory: `project_mobile_turbopack.md`). Use production builds for iOS device testing.
- **Stripe RN SDK uses PaymentSheet, not Embedded Checkout.** Embedded is web-only.
- **Don't run `supabase db push`** — Aidan pastes SQL manually into Studio (memory: `project_migration_workflow.md`). The app shouldn't need migrations anyway since the website owns the schema.
- **App uses anon key for all DB writes.** Any new endpoint Aidan adds for app-only use should still go on the website (`bldesy-web/app/api/…`), not as an Expo route.
- **The website's prod URL** (whatever it is — `bldesy.com.au` is the assumed domain) is the API base. Store in `.env` / `eas.json` as `EXPO_PUBLIC_API_BASE_URL`.

---

## 4. Things to LEAVE ALONE in the app (already correct or app-only on purpose)

- AI tab (`app/(tabs)/ai.tsx`) — app-exclusive, don't port back to web
- Dashboard widgets: `health-gauge`, `ai-coach-card`, `metric-card`
- `cookie-banner`, `offline-banner`, `swipeable-tab-view`
- `react-native-maps` (not Leaflet — different rendering on purpose)
- Custom `constants/theme` design tokens (don't try to port Tailwind v4 to RN)

---

## 5. Definition of done

Parity is shipped when:
- [ ] User can delete their account from the app and the row is gone in Supabase
- [ ] User can pick any tradie or enterprise tier in the app and complete payment via PaymentSheet
- [ ] User can cancel / resume / swap subscription from the app
- [ ] Job application is gated by active subscription
- [ ] Push notifications arrive on a physical device after a relevant trigger
- [ ] Insurance verdict pill appears on builder profiles
- [ ] Signup uses unified profile + `/welcome` role picker
- [ ] No screen says "Commercial" or "Residential" in customer-facing job-type contexts
- [ ] Turnstile (or equivalent) gates signup
- [ ] Settings shows real tier + notification preferences

---

## 6. Suggested first prompts for the new session

Once you open Claude Code in `~/myApp`:

> "Read PARITY-HANDOFF.md and start with Item 1 — wire the delete-account button in app/settings.tsx to the real endpoint at the website. Add a password reconfirm modal and call POST /api/auth/delete-account with a Bearer token."

Then, after that ships:

> "Read PARITY-HANDOFF.md Item 3. Install @stripe/stripe-react-native and rewrite app/subscribe.tsx to show the 4 tradie tiers from lib/pricing-tiers-client.ts (copy that file from ~/bldesy-web/lib first). Wire each tier card to open Stripe PaymentSheet using a client secret from POST /api/stripe/tier-checkout."

…and so on, one item at a time.
