# BLDESY mobile app — engineering conventions

Expo SDK 54 · expo-router 6 · React Native 0.81 · TypeScript strict. This app is the
**native twin of the mobile website** at `~/bldesy-web` (Next 16). The website is the
source of truth for every rule, string and screen; the app mirrors it in **LIVE mode**
(no waitlist mode — see `lib/launch-flags.ts`). Parity plan + decisions:
`~/.claude/plans/ok-big-task-here-dynamic-brooks.md`.

## Non-negotiables

1. **Never fork website logic.** Pure rules (trades, scoring, zones, tiers, visibility,
   completeness, portal status, billing state, copy constants) live in `lib/web/` as
   verbatim copies produced by `npm run sync:web` (`scripts/sync-web-libs.mjs`). Edit the
   website original, re-run the sync. `npm run sync:web:check` fails on drift. Never hand-edit
   `lib/web/**`, `types/database.ts`, `types/index.ts` or `__tests__/web/**`.
2. **Cross-user reads use the PII-safe views only**: `public_builder_profiles`,
   `public_enterprise_profiles`, `public_profiles`. Base tables are RLS-locked to the owner.
   Discovery surfaces (search, map, trade pages, saved) also apply
   `applySearchableFilters` from `lib/web/queries/searchable-filter.ts`.
3. **Writes that carry business logic go through the website API** via `lib/api.ts`
   (`api.get/post/patch/put/delete`, Bearer + `X-Client: mobile` + `X-Mobile-Secret`):
   messages, EOI, contact reveal, application accept/reject, post job, capabilities,
   referrals, notifications + preferences, push registration, billing, delete account,
   report. Own-row profile edits (`builder_profiles`, `customer_profiles`,
   `saved_builders`, `applications` insert) may use supabase-js directly under RLS, as the
   website does. Never call the revoked RPCs `get_builder_contact` / `get_job_contact`.
4. **Copy is copied, not written.** Every user-facing string comes from the website
   component being ported or from `lib/web/verification-copy.ts`. Australian English.
   No emoji in nav.
5. **Routes mirror website paths** (`app/portal/billing.tsx` ⇄ `/portal/billing`), so push
   `data.route` deep links map 1:1. Tabs group `(tabs)` holds Home/AI/Map; Search and
   Post Job are pushes.
6. **iOS sells nothing.** `lib/iap-policy.ts` `CAN_SELL_IN_APP` gates every price, tier
   card, purchase button and purchase link. iOS billing is read-only (plan state, meter,
   cancel/resume). Do not link to a web purchase page. See `docs/APP-REVIEW-NOTES.md`.
7. **Tradie onboarding + credential verification are a web hand-off** through
   `lib/web-onboarding.ts` (`/auth/app-bridge#…&next=…`). Do not rebuild the wizard.
8. **Gates call `zoneIsLive()`** from `lib/launch-flags.ts`. Project Jobs / Contracts show
   the Stage 2 teaser while `STAGE2_JOBS_LIVE` (mirrored) is false. Nothing hardcodes
   "waitlist".

## Design tokens

`constants/theme.ts` mirrors `~/bldesy-web/app/globals.css`: primary `#0D9B7A`, canvas
`#FFF8F0`, surface, text, border, indigo (enterprise), **cta amber `#F59E0B`** (homeowner
conversion actions only — never for tradie CTAs, which are primary green), trade colours.
Fonts: Geist 400/500/600/700 body, Russo One wordmark + display headings. Radii: cards
`Radius.xl` (web `rounded-2xl`), pills full. Primitives: `components/ui/*`.

## Commands

- `npm run typecheck` · `npm test` (vitest; `__tests__/web/*` are the website's own tests
  run against the mirror) · `npm run lint`
- `npm run sync:web` after any website lib change
- Dev: `npx expo start`; device testing needs a dev build (Expo Go lacks Apple auth,
  Stripe, maps). EAS: `eas build -p ios --profile preview`.

## Environment

`.env` (gitignored, see `.env.example`): Supabase URL/anon key, `EXPO_PUBLIC_API_BASE_URL`
(**www** host — the apex strips the Authorization header on redirect), live Stripe
publishable key, `EXPO_PUBLIC_MOBILE_APP_SECRET` (value of `MOBILE_APP_SECRET` in the
website's Vercel Production env; also create it as an EAS sensitive env var).

## Backend ownership

Schema, migrations and Edge Functions belong to `~/bldesy-web`. Aidan applies SQL in
Supabase Studio by hand; this repo never runs `supabase db push`. Preview/dev share the
PROD database — never create test data without cleaning it up.
