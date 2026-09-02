// AUTO-SYNCED from ~/bldesy-web/lib/funnel/events.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Funnel event registry — the single TypeScript source of truth for event
 * names, which funnel they belong to, and their step order.
 *
 * Mirrored in SQL by the funnel_steps table (supabase/migrations/
 * 20260707_funnel_events.sql) which drives funnel_report() — keep in sync.
 * Events with `inChain: false` are recorded but excluded from the conversion
 * chain (branch/engagement signals, queried separately).
 *
 * No `server-only`: the client tracking helper needs this registry too.
 * The /api/track route validates incoming names against it, so the client
 * can never invent events.
 */

export type FunnelName = "shared" | "homeowner_waitlist" | "tradie_onboarding";

export interface FunnelEventDef {
  funnel: FunnelName;
  stepIndex: number;
  /** Landing/started events fire at most once per browser session. */
  oncePerSession?: boolean;
  /** false = recorded but not part of the linear conversion chain. */
  inChain?: boolean;
}

export const FUNNEL_EVENTS = {
  // ── Shared (precede the homeowner/tradie fork) ──────────────────────
  homepage_landed: { funnel: "shared", stepIndex: 0, oncePerSession: true },
  get_started_tapped: { funnel: "shared", stepIndex: 0, inChain: false },
  // In-chain: unions with homepage_landed as tradie step 0 (funnel_steps).
  for_tradies_landed: { funnel: "shared", stepIndex: 0, oncePerSession: true },

  // ── Homeowner waitlist ──────────────────────────────────────────────
  waitlist_cta_tapped: { funnel: "homeowner_waitlist", stepIndex: 1 },
  waitlist_page_landed: { funnel: "homeowner_waitlist", stepIndex: 2, oncePerSession: true },
  waitlist_form_started: { funnel: "homeowner_waitlist", stepIndex: 3, oncePerSession: true },
  waitlist_submitted: { funnel: "homeowner_waitlist", stepIndex: 4 },

  // /for-homeowners coverage search — every resolved suburb lookup is a
  // demand signal, covered or not (meta: suburb/covered/zone slug). Feeds
  // "where do homeowners actually want us next". inChain:false keeps it off
  // the conversion chain (and out of funnel_steps).
  coverage_suburb_searched: { funnel: "homeowner_waitlist", stepIndex: 0, inChain: false },

  // Step 2 saved something (draw answer / trade / urgency / second contact).
  // Recorded server-side by the PATCH; client mirrors to GA4.
  waitlist_details_completed: { funnel: "homeowner_waitlist", stepIndex: 4, inChain: false },
  // Referral loop: a share/copy tap on the MATE- code card (client)…
  referral_share: { funnel: "homeowner_waitlist", stepIndex: 0, inChain: false },
  // …and a join that credited someone's code (server, meta.code).
  referral_joined: { funnel: "homeowner_waitlist", stepIndex: 0, inChain: false },

  // ── Engagement signals (recorded, not part of a conversion chain) ───
  // A visitor sent a tradie an Expression of Interest from their profile.
  eoi_submitted: { funnel: "shared", stepIndex: 0, inChain: false },
  // A search rendered results (meta: trade/location/filters/sort/page +
  // meta.total — total=0 rows are the unmet-demand signal). Fires once per
  // distinct query, so pagination/sort changes record as fresh searches.
  search_performed: { funnel: "shared", stepIndex: 0, inChain: false },
  // A result card was clicked through to the profile (meta: builder_id,
  // position within the page, match percent). Joined to the preceding
  // search_performed via session_id for CTR-by-position ranking tuning.
  search_result_clicked: { funnel: "shared", stepIndex: 0, inChain: false },
  // Landing-page soft engagement (EngagementBeacon): scroll_depth fires
  // once per page per session at each of 25/50/75% (meta.pct); time_engaged
  // fires once per page per session after ~15s of visible time
  // (meta.seconds). Surfaced in the dashboard's paid funnel view so the
  // gap between ad click and form start is visible. MUST stay out of
  // funnel_steps — inChain:false keeps them off the conversion chain.
  scroll_depth: { funnel: "shared", stepIndex: 0, inChain: false },
  time_engaged: { funnel: "shared", stepIndex: 0, inChain: false },

  // A tradie asked to join the waitlist for a full (or not-yet-launched)
  // trade × area — the capped-supply capture (meta: trade/zone/source).
  tradie_area_waitlist_joined: { funnel: "tradie_onboarding", stepIndex: 0, inChain: false },
  // "Text me the application link" capture on /for-tradies and the wizard
  // (meta.source). Consented SMS lead — see /api/sms-link.
  sms_link_requested: { funnel: "tradie_onboarding", stepIndex: 0, inChain: false },
  // A callable lead persisted from wizard step 1 (contact details captured
  // before the application is finished — recorded by /api/tradie-leads).
  tradie_lead_captured: { funnel: "tradie_onboarding", stepIndex: 0, inChain: false },
  // The /for-tradies callback form ("we'll bell you") — the paid-channel
  // conversion. Recorded by /api/callback-request with first-touch UTMs;
  // utm_content carries the ad id, which is how the ops dashboard joins
  // this submit to its ad. The Meta Lead event for this fires with an
  // eventID (browser + CAPI dedup pair) — deliberately NOT in
  // META_PIXEL_EVENTS, or it would double-fire.
  callback_requested: { funnel: "tradie_onboarding", stepIndex: 0, inChain: false },

  // ── Pipeline canary ─────────────────────────────────────────────────
  // The ops dashboard's nightly collector POSTs this through the real
  // /api/track path and verifies it lands in funnel_events — proving the
  // pipe end-to-end so silence on the Funnels page is provably "no
  // traffic", never "broken pipe". MUST stay out of funnel_steps:
  // funnel_report() counts via that table, which is what keeps canary
  // rows out of every funnel number.
  canary_ping: { funnel: "shared", stepIndex: 0, inChain: false },

  // Weekly-active signal (P3.2): a tradie one-tapped the "still taking on
  // work this week?" prompt. Weekly-active share = distinct users with this
  // event per week.
  availability_confirmed: { funnel: "shared", stepIndex: 0, inChain: false },

  // ── Tradie onboarding ───────────────────────────────────────────────
  tradie_signup_cta_tapped: { funnel: "tradie_onboarding", stepIndex: 1 },
  tradie_signup_started: { funnel: "tradie_onboarding", stepIndex: 2, oncePerSession: true },
  // An anonymous onboarding session was minted for a no-account visitor
  // entering the tradie wizard (recorded server-side by /api/auth/anon/
  // bootstrap). account_created still marks the moment a CONTACTABLE account
  // exists — for anon signups that's claim/activation after approval — so
  // this stays out of the conversion chain (and out of funnel_steps).
  anon_onboarding_started: { funnel: "tradie_onboarding", stepIndex: 3, inChain: false },
  account_created: { funnel: "tradie_onboarding", stepIndex: 3 },
  wizard_opened: { funnel: "tradie_onboarding", stepIndex: 4, oncePerSession: true },
  step_business_completed: { funnel: "tradie_onboarding", stepIndex: 5 },
  step_trade_location_completed: { funnel: "tradie_onboarding", stepIndex: 6 },
  step_white_card_completed: { funnel: "tradie_onboarding", stepIndex: 7 },
  step_government_id_completed: { funnel: "tradie_onboarding", stepIndex: 8 },
  verification_submitted: { funnel: "tradie_onboarding", stepIndex: 9 },
  verification_flagged: { funnel: "tradie_onboarding", stepIndex: 10, inChain: false },
  verified: { funnel: "tradie_onboarding", stepIndex: 10 },
  checkout_started: { funnel: "tradie_onboarding", stepIndex: 11 },
  // Value-gated billing card-on-file — tracked as its own step (decision
  // 2026-07-28) so drop-off AT the card ask is visible if signups stall
  // there. card_setup_started = SetupIntent minted (the form was reached);
  // card_on_file = payment method attached. Same slot as the legacy
  // checkout_started step.
  card_setup_started: { funnel: "tradie_onboarding", stepIndex: 11, inChain: false },
  card_on_file: { funnel: "tradie_onboarding", stepIndex: 11 },
  profile_live: { funnel: "tradie_onboarding", stepIndex: 12 },
} as const satisfies Record<string, FunnelEventDef>;

export type FunnelEventName = keyof typeof FUNNEL_EVENTS;

export function isFunnelEventName(name: string): name is FunnelEventName {
  return Object.prototype.hasOwnProperty.call(FUNNEL_EVENTS, name);
}

/** Pre-auth identity cookie — same carry pattern as the bld_ref referral cookie. */
export const ANONYMOUS_ID_COOKIE = "bld_aid";
export const ANONYMOUS_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Internal-traffic marker — set via /internal-traffic on our own devices.
 * When present (value "1"), funnel events are dropped at every layer and the
 * third-party trackers (GA4/Clarity/Meta) never init. Deliberately unsigned:
 * a visitor who sets it by hand only opts themselves out of analytics.
 * NOT httpOnly — track-client and the tracker snippets read it in-browser.
 */
export const INTERNAL_TRAFFIC_COOKIE = "bld_int";
export const INTERNAL_TRAFFIC_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
