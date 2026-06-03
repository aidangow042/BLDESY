# BLDESY — App Store Submission Checklist

Everything that can be done in code for the Apple review checklist (items 1–9, 12) is **done in this repo + `~/bldesy-web`**. This file lists the remaining steps that require your Apple Developer account, App Store Connect (ASC), Supabase, or a real build — none of which can be done from code.

---

## 0. Deploy / backend dependencies (do first)
These make the in-app features actually work:
- [ ] Deploy `~/bldesy-web` to production (hosts `/api/report`, `/admin/reports`, account-deletion email, the `/auth/app-bridge` signup hand-off).
- [ ] Apply migration `~/bldesy-web/supabase/migrations/20260603_ugc_moderation.sql` to the Supabase project.
- [ ] Set `ADMIN_EMAIL` in the web (Vercel) env (falls back to hello@bldesy.com.au).
- [ ] Confirm Supabase **Site URL / redirect URLs** and that auth emails are confirmed-deliverable.

## 1. Apple Developer Program (item 13)
- [ ] Enrol in the Apple Developer Program ($99/yr) — individual or company.
- [ ] Create the App ID for `com.bldesy.app`.
- [ ] **Enable the "Sign In with Apple" capability** on that App ID (item 7).
- [ ] Create the app record in App Store Connect.

## 2. Sign in with Apple — backend config (item 7)
- [ ] Supabase → Authentication → Providers → **Apple**: add `com.bldesy.app` to **Authorized Client IDs** (alongside the website's Services ID).
- [ ] Verify the website's Apple provider (Services ID, Team ID, Key ID, private key) is still valid.
- [ ] Test on a TestFlight/dev build (does **not** work in Expo Go).

## 3. eas.json submit credentials (items 10, 13)
Fill the empty fields in `eas.json` (production submit profile):
- [ ] `appleId` — your Apple ID email.
- [ ] `ascAppId` — the App Store Connect app's numeric ID.
- [ ] `appleTeamId` — your Apple Developer Team ID.
- [ ] (Android, later) `serviceAccountKeyPath`.

## 4. Build target / SDK (item 10)
- [ ] Build with EAS using a current Expo SDK (currently Expo 54) — `eas build -p ios --profile production`. EAS uses an Apple-accepted Xcode/SDK; **verify the minimum SDK requirement on Apple's developer site at submission time** (it changes — don't assume).
- [ ] Test the production build on a **real iPhone** for crashes (item 8): launch, search, post a job, AI Assist, Map, builder portal, Sign in with Apple, report/block, delete account.

## 5. App Privacy "nutrition labels" (item 6)
In ASC → App Privacy, declare (mapping in the privacy section of the vault / matches `lib/legal/privacy-policy.ts`):
- [ ] Contact Info (name, email, phone, address) — linked, App Functionality.
- [ ] Location (coarse + precise) — linked, App Functionality.
- [ ] User Content (photos, messages, reviews, AI prompts) — linked, App Functionality.
- [ ] Identifiers (user ID, device ID) — linked, App Functionality.
- [ ] Usage Data — linked, Analytics.
- [ ] Diagnostics (crash/performance) — not linked.
- [ ] **Used to Track You: NO** for all (no ad SDK / IDFA).
- [ ] **Do not** declare Payment/Purchase data for iOS (nothing is sold in-app).
- [ ] Privacy Policy URL: `https://bldesy.com.au/legal/privacy`.

## 6. Metadata hygiene (item 11) — all in ASC
- [ ] App name, subtitle, description — **no mention of Android / Google Play / other platforms** in the *listing* (in-app legal docs covering both platforms are fine).
- [ ] Screenshots — real, current screens (required sizes); no Android frames.
- [ ] Age rating questionnaire — complete it honestly (the app has user-generated content + unrestricted web access via the in-app browser hand-off → expect a 17+ / appropriate rating).
- [ ] Support URL + Marketing URL set.
- [ ] No fake reviews / ranking manipulation; no other brand's name or icon.

## 7. App Review Information (item 12)
- [ ] Create the two demo accounts (see `docs/APP-REVIEW-NOTES.md`): a customer, and an **approved + subscribed** builder.
- [ ] Paste the App Review Notes (from that file) into ASC, with credentials in Sign-In Information.

## 8. Final
- [ ] Confirm backend (Supabase + web) is live and reachable during review.
- [ ] Submit for review.

---

### Already handled in code (no action needed)
Account deletion + email · UGC report/block/filter + admin queue · AI disclosure/consent + labelling · iOS payments gated off (3.1.1) · permission strings + point-of-use push · privacy policy accuracy · Sign in with Apple (app side) · completeness fixes (no placeholder/dead buttons).
