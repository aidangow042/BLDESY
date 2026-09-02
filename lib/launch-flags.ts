/**
 * Launch flags for the app — the app-side twin of the website's
 * `lib/waitlist-mode.ts` + `lib/prelaunch.ts`.
 *
 * DECISION (Aidan, 2026-09-02): the app mirrors the FULLY LIVE website —
 * `WAITLIST_MODE=false` and `PRE_LAUNCH=false`. There is no waitlist mode in
 * the app. The only gate that still applies is Stage 2 (business side): Project
 * Jobs and Contracts show the Stage 2 teaser exactly like the web while
 * `STAGE2_JOBS_LIVE` (mirrored from the web via lib/web/stage2.ts) is false.
 *
 * Every portal/launch gate in the app must call `zoneIsLive(zone)` — nothing
 * hardcodes "waitlist". The zone names match the website so copy and behaviour
 * can be ported 1:1. `isZoneGated()` exists only so mirrored web code that
 * references it keeps compiling; it always returns false.
 */
import { STAGE2_JOBS_LIVE } from '@/lib/web/stage2';

export const WAITLIST_MODE = false as const;
export const PRE_LAUNCH = false as const;

export type LaunchMode = 'waitlist' | 'live';
export const LAUNCH_MODE: LaunchMode = 'live';

export type WaitlistZone =
  | 'search'
  | 'map'
  | 'ai'
  | 'trades'
  | 'profiles'
  | 'signup'
  | 'eoi'
  | 'dashboard'
  | 'messages'
  | 'enterprise'
  | 'pricing'
  | 'jobs';

export type LaunchZone =
  | WaitlistZone
  | 'home_jobs'
  | 'quick_apply'
  | 'portal_messages'
  | 'project_jobs'
  | 'contracts';

const STAGE2_ZONES: ReadonlySet<LaunchZone> = new Set<LaunchZone>(['project_jobs', 'contracts']);

/** Always false in the app — see the decision above. */
export function isZoneGated(_zone: WaitlistZone): boolean {
  return false;
}

/** Same semantics as the web's `zoneIsLiveCore` with LAUNCH_MODE fixed to "live". */
export function zoneIsLive(zone: LaunchZone): boolean {
  if (STAGE2_ZONES.has(zone)) return STAGE2_JOBS_LIVE;
  return true;
}

export { STAGE2_JOBS_LIVE };
