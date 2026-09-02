/**
 * Public (mostly signed-out) forms and counters — typed clients for:
 *   POST/PATCH /api/waitlist        ~/bldesy-web/app/api/waitlist/route.ts
 *                                   (client: components/waitlist/waitlist-form.tsx)
 *   POST /api/contact               app/api/contact/route.ts (client: app/help/page.tsx)
 *   POST /api/callback-request      app/api/callback-request/route.ts
 *                                   (client: components/tradie/callback-form.tsx)
 *   POST /api/sms-link              app/api/sms-link/route.ts
 *                                   (client: components/tradie/sms-link-form.tsx)
 *   POST /api/tradie-area-waitlist  app/api/tradie-area-waitlist/route.ts
 *   GET  /api/supply/spots, /api/supply/founding
 *                                   (clients: components/supply/spots-remaining.tsx,
 *                                   components/supply/founding-spots.tsx)
 *   POST /api/consent/cookies       (client: components/layout/cookie-banner.tsx)
 *   GET  /api/suburbs               (client: lib/geo-client.ts)
 *
 * The app's `X-Mobile-Secret` replaces Cloudflare Turnstile on these routes,
 * so no `turnstileToken` is sent; every honeypot (`company`) is always "".
 * Bodies are built by pure, unit-tested builders that mirror the web forms.
 */
import { api, ApiError } from '@/lib/api';
import type { FirstTouch } from '@/lib/data/tracking';
import { FOUNDING_ZONES } from '@/lib/web/service-areas';
import type { ZoneSpots } from '@/lib/web/supply-caps';
import { getTradeBySlug } from '@/lib/web/trades';

/* ───────────────────────────── Shared copy ───────────────────────────── */

/** Website copy for a failed request that never reached the server. */
export const WAITLIST_NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";
export const TRADIE_FORM_NETWORK_ERROR = 'Network error — check your connection and try again.';
export const CONTACT_NETWORK_ERROR = 'Something went wrong. Please check your connection.';
export const CONTACT_FAILED_ERROR = 'Failed to send message. Please try again.';
export const GENERIC_FORM_ERROR = 'Something went wrong. Please try again.';

/**
 * The line a form shows for a failed submit: the server's own message for an
 * HTTP error, else the form's connection copy.
 */
export function publicFormErrorMessage(e: unknown, networkCopy: string = GENERIC_FORM_ERROR): string {
  if (e instanceof ApiError) return e.message || GENERIC_FORM_ERROR;
  return networkCopy;
}

/** utm_* + first_referrer from the session's first touch, as the web forms spread it. */
export function firstTouchFields(touch: FirstTouch | null | undefined): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  first_referrer?: string;
} {
  if (!touch) return {};
  return {
    utm_source: touch.source || undefined,
    utm_medium: touch.medium || undefined,
    utm_campaign: touch.campaign || undefined,
    utm_content: touch.content || undefined,
    utm_term: touch.term || undefined,
    first_referrer: touch.referrer || undefined,
  };
}

function orNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/* ───────────────────────────── Waitlist ───────────────────────────── */

/**
 * WHICH SURFACE captured a waitlist signup — copied from
 * ~/bldesy-web/lib/waitlist/sources.ts WAITLIST_SOURCES (mirrored by a DB
 * CHECK; widen both together). TODO: add lib/waitlist/sources.ts to
 * scripts/sync-web-libs.mjs and import from @/lib/web instead.
 */
export const WAITLIST_SOURCES = [
  'waitlist_page',
  'gated_redirect',
  'search_miss',
  'trade_landing',
  'coverage_map',
  'blog_cta',
  'home_hero',
] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export const WAITLIST_URGENCIES = ['asap', 'this_week', 'few_months', 'planning'] as const;
export type WaitlistUrgency = (typeof WAITLIST_URGENCIES)[number];

export const WAITLIST_ENTRY_TYPES = ['job', 'story', 'unknown'] as const;
export type WaitlistEntryType = (typeof WAITLIST_ENTRY_TYPES)[number];

export interface WaitlistJoinInput {
  suburb: string;
  postcode?: string | null;
  /** Email OR phone — at least one. */
  email?: string | null;
  phone?: string | null;
  trade_category?: string | null;
  sub_trade?: string | null;
  source: WaitlistSource;
  /** The trade + suburb the visitor ASKED FOR and we could not serve (not the editable fields). */
  searched_trade?: string | null;
  searched_suburb?: string | null;
  /** A mate's MATE- code. */
  referral_code?: string | null;
  /** SMS-updates consent — only meaningful with a phone. */
  sms_opt_in?: boolean;
  /** Weekly digest consent — only meaningful with an email. */
  marketing_opt_in?: boolean;
  /** Single-shot submissions may send the step-2 fields on POST too. */
  job_description?: string | null;
  entry_type?: WaitlistEntryType | null;
  urgency?: WaitlistUrgency | null;
  firstTouch?: FirstTouch | null;
}

export interface WaitlistJoinBody {
  suburb: string;
  postcode: string | null;
  email: string | null;
  phone: string | null;
  trade_category: string | null;
  sub_trade?: string;
  source: WaitlistSource;
  searched_trade?: string;
  searched_suburb?: string;
  company: '';
  referral_code: string | null;
  sms_opt_in?: boolean;
  marketing_opt_in?: boolean;
  job_description?: string;
  entry_type?: WaitlistEntryType;
  urgency?: WaitlistUrgency;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  first_referrer?: string;
}

/** Mirrors waitlist-form.tsx handleJoin: consents ride only with their channel. */
export function buildWaitlistJoinBody(input: WaitlistJoinInput): WaitlistJoinBody {
  const email = orNull(input.email);
  const phone = orNull(input.phone);
  return {
    suburb: input.suburb.trim(),
    postcode: orNull(input.postcode),
    email,
    phone,
    trade_category: orNull(input.trade_category),
    sub_trade: orNull(input.sub_trade) ?? undefined,
    source: input.source,
    searched_trade: orNull(input.searched_trade) ?? undefined,
    searched_suburb: orNull(input.searched_suburb) ?? undefined,
    company: '',
    referral_code: orNull(input.referral_code),
    sms_opt_in: phone ? input.sms_opt_in : undefined,
    marketing_opt_in: email ? input.marketing_opt_in : undefined,
    job_description: orNull(input.job_description) ?? undefined,
    entry_type: input.entry_type ?? undefined,
    urgency: input.urgency ?? undefined,
    ...firstTouchFields(input.firstTouch),
  };
}

export interface WaitlistJoinResponse {
  ok: true;
  /** A repeat email/phone RESUMES the existing signup instead of a second row. */
  already?: boolean;
  draw_entry_no: number;
  draw_entered: boolean;
  suburb?: string | null;
  trade_category?: string | null;
  trade_name?: string | null;
  sub_trade?: string | null;
  /** Signed token for the step-2 PATCH; null when the server can't sign (dev). */
  details_token: string | null;
  own_referral_code: string | null;
  referral_bonus_entries: number;
  sms_opt_in?: boolean;
}

/** Join the homeowner waitlist (step 1). 400 validation / "Add an email or mobile number…", 429. */
export async function joinWaitlist(input: WaitlistJoinInput): Promise<WaitlistJoinResponse> {
  return api.post<WaitlistJoinResponse>('/api/waitlist', buildWaitlistJoinBody(input));
}

export interface WaitlistDetailsInput {
  details_token: string;
  job_description?: string | null;
  entry_type?: WaitlistEntryType | null;
  trade_category?: string | null;
  sub_trade?: string | null;
  urgency?: WaitlistUrgency | null;
  phone?: string | null;
  email?: string | null;
  referral_code?: string | null;
  marketing_opt_in?: boolean;
  sms_opt_in?: boolean;
}

export interface WaitlistDetailsBody {
  details_token: string;
  job_description: string | null;
  entry_type?: WaitlistEntryType;
  trade_category: string | null;
  sub_trade: string | null;
  urgency: WaitlistUrgency | null;
  phone: string | null;
  email: string | null;
  referral_code: string | null;
  marketing_opt_in?: boolean;
  sms_opt_in?: boolean;
}

/** Mirrors waitlist-form.tsx step 2: SMS consent only when a phone is added this step. */
export function buildWaitlistDetailsBody(input: WaitlistDetailsInput): WaitlistDetailsBody {
  const phone = orNull(input.phone);
  return {
    details_token: input.details_token,
    job_description: orNull(input.job_description),
    entry_type: input.entry_type ?? undefined,
    trade_category: orNull(input.trade_category),
    sub_trade: orNull(input.sub_trade),
    urgency: input.urgency ?? null,
    phone,
    email: orNull(input.email),
    referral_code: orNull(input.referral_code),
    marketing_opt_in: input.marketing_opt_in,
    sms_opt_in: phone ? input.sms_opt_in : undefined,
  };
}

export interface WaitlistDetailsResponse {
  ok: true;
  draw_entry_no: number;
  draw_entered: boolean;
  trade_name: string | null;
  own_referral_code: string | null;
  referral_bonus_entries: number;
}

/** Attach step-2 details to a signup (401 invalid/expired token, 409 "That email's already on the waitlist."). */
export async function saveWaitlistDetails(input: WaitlistDetailsInput): Promise<WaitlistDetailsResponse> {
  return api.patch<WaitlistDetailsResponse>('/api/waitlist', buildWaitlistDetailsBody(input));
}

/* ───────────────────────────── Contact (Help page) ───────────────────────────── */

export interface ContactInput {
  name: string;
  email: string;
  /** 10–5000 chars server-side. */
  message: string;
}

export function buildContactBody(input: ContactInput): ContactInput {
  return { name: input.name.trim(), email: input.email.trim(), message: input.message.trim() };
}

/** Help & Support contact form. 400 validation, 429 (3/hour/IP). */
export async function submitContactForm(input: ContactInput): Promise<void> {
  await api.post<{ ok: true }>('/api/contact', buildContactBody(input));
}

/* ───────────────────────────── Callback request (For Tradies) ───────────────────────────── */

export interface CallbackRequestInput {
  name: string;
  phone: string;
  trade?: string | null;
  qualifier?: string | null;
  /** Meta Lead dedup id shared with the pixel — optional in the app (no pixel). */
  event_id?: string | null;
  firstTouch?: FirstTouch | null;
}

export interface CallbackRequestBody {
  name: string;
  phone: string;
  trade?: string;
  qualifier?: string;
  event_id?: string;
  company: '';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export function buildCallbackRequestBody(input: CallbackRequestInput): CallbackRequestBody {
  const { first_referrer: _referrer, ...utm } = firstTouchFields(input.firstTouch);
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    trade: orNull(input.trade) ?? undefined,
    qualifier: orNull(input.qualifier) ?? undefined,
    event_id: orNull(input.event_id) ?? undefined,
    company: '',
    ...utm,
  };
}

/** "Flick us your number and we'll bell you." 400 "Add your name." / bad mobile, 429. */
export async function requestCallback(input: CallbackRequestInput): Promise<void> {
  await api.post<{ ok: true }>('/api/callback-request', buildCallbackRequestBody(input));
}

/* ───────────────────────────── SMS link (For Tradies) ───────────────────────────── */

export type SmsLinkSource = 'for_tradies' | 'wizard_banner';

export interface SmsLinkInput {
  first_name: string;
  phone: string;
  source: SmsLinkSource;
  firstTouch?: FirstTouch | null;
}

export interface SmsLinkBody {
  first_name: string;
  phone: string;
  source: SmsLinkSource;
  company: '';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export function buildSmsLinkBody(input: SmsLinkInput): SmsLinkBody {
  const { first_referrer: _referrer, ...utm } = firstTouchFields(input.firstTouch);
  return {
    first_name: input.first_name.trim(),
    phone: input.phone.trim(),
    source: input.source,
    company: '',
    ...utm,
  };
}

/** "Not near your paperwork? We'll text you the link." 400 bad mobile, 429. */
export async function requestSmsLink(input: SmsLinkInput): Promise<void> {
  await api.post<{ ok: true }>('/api/sms-link', buildSmsLinkBody(input));
}

/* ───────────────────────────── Tradie area waitlist ───────────────────────────── */

export type TradieAreaWaitlistSource = 'wizard' | 'for_tradies';

/** Every founding zone slug + the catch-all, verbatim from the route's ZONE_SLUGS. */
export const TRADIE_AREA_ZONE_SLUGS: readonly string[] = [
  ...FOUNDING_ZONES.map((z) => z.slug),
  'outside-launch-area',
];

export interface TradieAreaWaitlistInput {
  trade_category: string;
  zone_slug: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  source: TradieAreaWaitlistSource;
}

export interface TradieAreaWaitlistBody {
  trade_category: string;
  zone_slug: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  source: TradieAreaWaitlistSource;
  company: '';
}

export function buildTradieAreaWaitlistBody(input: TradieAreaWaitlistInput): TradieAreaWaitlistBody {
  return {
    trade_category: input.trade_category,
    zone_slug: input.zone_slug,
    contact_name: orNull(input.contact_name) ?? undefined,
    phone: orNull(input.phone) ?? undefined,
    email: orNull(input.email) ?? undefined,
    source: input.source,
    company: '',
  };
}

/**
 * "My trade is full in my area" capture. A signed-in session (anonymous
 * onboarding sessions count) needs no contact; signed-out callers must give a
 * phone or email. Duplicates resolve to `{ ok: true, already: true }`.
 */
export async function joinTradieAreaWaitlist(
  input: TradieAreaWaitlistInput,
): Promise<{ ok: true; already?: boolean }> {
  return api.post<{ ok: true; already?: boolean }>(
    '/api/tradie-area-waitlist',
    buildTradieAreaWaitlistBody(input),
  );
}

/* ───────────────────────────── Supply counters ───────────────────────────── */

export function supplySpotsPath(trade: string): string {
  return `/api/supply/spots?trade=${encodeURIComponent(trade)}`;
}

/**
 * Live "spots remaining per founding zone" for one trade. Null on an unknown
 * trade, `{ ok: false }` or any failure — the UI degrades to cap-only copy
 * (never a broken state, never made-up numbers), as the website does.
 */
export async function fetchSupplySpots(trade: string): Promise<ZoneSpots[] | null> {
  if (!getTradeBySlug(trade)) return null;
  try {
    const json = await api.get<{ ok: boolean; trade?: string; zones?: ZoneSpots[] }>(supplySpotsPath(trade));
    return json.ok && json.zones ? json.zones : null;
  } catch {
    return null;
  }
}

export interface FoundingSpots {
  cap: number;
  taken: number;
  remaining: number;
}

/** Live "X of 200 founding spots left". Null on `{ ok: false }` or failure. */
export async function fetchFoundingSpots(): Promise<FoundingSpots | null> {
  try {
    const json = await api.get<{ ok: boolean; cap?: number; taken?: number; remaining?: number }>(
      '/api/supply/founding',
    );
    if (!json.ok || json.cap == null || json.taken == null || json.remaining == null) return null;
    return { cap: json.cap, taken: json.taken, remaining: json.remaining };
  } catch {
    return null;
  }
}

/* ───────────────────────────── Cookie consent ───────────────────────────── */

export type CookieConsentDecision = 'accepted' | 'declined';

/**
 * Fire-and-forget audit record of a banner decision (local storage stays the
 * source of truth for whether the banner shows). Never rejects.
 */
export async function recordCookieConsent(decision: CookieConsentDecision): Promise<void> {
  try {
    await api.post<{ ok: true }>('/api/consent/cookies', { decision });
  } catch (e) {
    console.warn('cookie consent beacon failed', e instanceof Error ? e.message : e);
  }
}

/* ───────────────────────────── Suburbs ───────────────────────────── */

/**
 * Suburb typeahead via the website (same answers as `getSuburbSuggestions`
 * in @/lib/geo, which runs against the bundled dataset offline — prefer that
 * on-device; this exists for parity with lib/geo-client.ts). [] below two
 * characters and on any failure.
 */
export async function suggestSuburbs(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  try {
    const json = await api.get<{ suggestions?: string[] }>(`/api/suburbs?q=${encodeURIComponent(query)}`);
    return json.suggestions ?? [];
  } catch {
    return [];
  }
}

/** Most likely 4-digit postcode for a suburb name; null when unknown or on failure. */
export async function postcodeForSuburb(suburb: string): Promise<string | null> {
  if (!suburb) return null;
  try {
    const json = await api.get<{ postcode?: string | null }>(
      `/api/suburbs?postcode=${encodeURIComponent(suburb)}`,
    );
    return json.postcode ?? null;
  } catch {
    return null;
  }
}

/** Server-side geocode of a suburb/postcode; null when unresolvable or on failure. */
export async function geocodeSuburb(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!query) return null;
  try {
    const json = await api.get<{ coords?: { latitude: number; longitude: number } | null }>(
      `/api/suburbs?geocode=${encodeURIComponent(query)}`,
    );
    return json.coords ?? null;
  } catch {
    return null;
  }
}
