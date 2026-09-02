/**
 * Funnel tracking — port of ~/bldesy-web/lib/funnel/track-client.ts for React
 * Native. Fire-and-forget, never throws; `POST /api/track` always answers 204
 * and validates event names against the shared registry
 * (@/lib/web/funnel/events), so the client can never invent events.
 *
 * Identity: the website mints a `bld_aid` cookie (1 year); the app persists
 * the same UUID in AsyncStorage (`bldesy_anon_id`) and sends it in the body
 * (the route accepts the body copy when no cookie is present). `session_id`
 * is one UUID per app launch (the web's per-tab sessionStorage id).
 * `user_id` is NEVER sent — the route reads the Bearer session server-side.
 *
 * Not ported: the GA4/Meta pixel mirror (no pixels in the app) and the
 * `bld_int` internal-traffic cookie fast path (the server still drops rows
 * for internal devices it recognises). `path` comes from the caller — there is
 * no window.location.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { api } from '@/lib/api';
import {
  FUNNEL_EVENTS,
  type FunnelEventDef,
  type FunnelEventName,
} from '@/lib/web/funnel/events';

export const ANONYMOUS_ID_STORAGE_KEY = 'bldesy_anon_id';

/** Session first-touch attribution — same shape the website keeps in sessionStorage. */
export interface FirstTouch {
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
}

export interface TrackPayload {
  name: FunnelEventName;
  meta?: Record<string, unknown>;
  anonymous_id: string;
  session_id: string;
  path?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

const ANON_ID_RE = /^[0-9a-f-]{36}$/i;

let anonymousIdPromise: Promise<string> | null = null;
let sessionId: string | null = null;
let firstTouch: FirstTouch | null = null;
const firedOnce = new Set<FunnelEventName>();

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/** Same loose 36-char check the website applies to the bld_aid cookie. */
export function isValidAnonymousId(id: unknown): id is string {
  return typeof id === 'string' && ANON_ID_RE.test(id);
}

/** RFC4122 v4 via expo-crypto, with the website's Math.random fallback. */
export function uuid(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** The exact body the website's tracker sends (undefined fields are omitted by JSON). */
export function buildTrackPayload(args: {
  name: FunnelEventName;
  meta?: Record<string, unknown>;
  anonymousId: string;
  sessionId: string;
  path?: string | null;
  touch?: FirstTouch | null;
}): TrackPayload {
  const touch = args.touch;
  return {
    name: args.name,
    meta: args.meta ?? undefined,
    anonymous_id: args.anonymousId,
    session_id: args.sessionId,
    path: args.path ?? undefined,
    referrer: touch?.referrer ?? undefined,
    utm_source: touch?.source ?? undefined,
    utm_medium: touch?.medium ?? undefined,
    utm_campaign: touch?.campaign ?? undefined,
    utm_content: touch?.content ?? undefined,
    utm_term: touch?.term ?? undefined,
  };
}

/* ───────────────────────────── Identity ───────────────────────────── */

/** Persistent per-install anonymous id (minted on first use, 1 year on the web). */
export function getAnonymousId(): Promise<string> {
  if (!anonymousIdPromise) {
    anonymousIdPromise = (async () => {
      try {
        const stored = await AsyncStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
        if (isValidAnonymousId(stored)) return stored;
        const fresh = uuid();
        await AsyncStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, fresh);
        return fresh;
      } catch {
        // Storage unavailable — a per-launch id still lets the row land.
        return uuid();
      }
    })();
  }
  return anonymousIdPromise;
}

/** One id per app launch (the web's per-tab session). */
export function getSessionId(): string {
  if (!sessionId) sessionId = uuid();
  return sessionId;
}

/**
 * Record the session's first-touch attribution (e.g. UTMs from the deep link
 * that opened the app). First write wins for the launch, like the web's
 * sessionStorage capture; attached to every event and available to forms via
 * `getFirstTouchAttribution()`.
 */
export function setFirstTouchAttribution(touch: Partial<FirstTouch>): void {
  if (firstTouch) return;
  firstTouch = {
    referrer: touch.referrer ?? null,
    source: touch.source ?? null,
    medium: touch.medium ?? null,
    campaign: touch.campaign ?? null,
    content: touch.content ?? null,
    term: touch.term ?? null,
  };
}

/** The session's first-touch attribution, for callers that persist it on their own rows (e.g. the waitlist submit). */
export function getFirstTouchAttribution(): FirstTouch | null {
  return firstTouch;
}

/* ───────────────────────────── Tracking ───────────────────────────── */

/**
 * Records a funnel event. Fire-and-forget; every failure is swallowed
 * (warned). Landing/started events (`oncePerSession`) fire at most once per
 * app launch. `path` = the screen's web-mirrored route when the caller has it.
 */
export function trackFunnelEvent(
  name: FunnelEventName,
  meta?: Record<string, unknown>,
  opts: { path?: string } = {},
): void {
  try {
    const def: FunnelEventDef | undefined = FUNNEL_EVENTS[name];
    if (!def) return;

    if (def.oncePerSession) {
      if (firedOnce.has(name)) return;
      firedOnce.add(name);
    }

    void (async () => {
      const anonymousId = await getAnonymousId();
      const payload = buildTrackPayload({
        name,
        meta,
        anonymousId,
        sessionId: getSessionId(),
        path: opts.path,
        touch: firstTouch,
      });
      await api.post<void>('/api/track', payload);
    })().catch((e) => {
      console.warn('funnel track failed', name, e instanceof Error ? e.message : e);
    });
  } catch {
    /* tracking must never break the app */
  }
}

/** Test hook: forget the launch session, once-flags and first touch. */
export function resetTrackingSession(): void {
  anonymousIdPromise = null;
  sessionId = null;
  firstTouch = null;
  firedOnce.clear();
}
