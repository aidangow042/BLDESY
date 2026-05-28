/**
 * Standard motion curves and durations — mirrors the BLDESY website's signature
 * timing. Pull from this file in every animation so the app has one consistent
 * feel rather than per-screen ad-hoc curves.
 *
 * Web source: `~/bldesy-web/components/home/hero-section.tsx` uses
 * `cubic-bezier(0.16, 1, 0.3, 1)` on the search overlay — that's the
 * "snappy ease-out with mild overshoot" feel we want everywhere.
 */

import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/* ── Easing curves ──────────────────────────────────────────────────── */

/** Web's signature easing — snappy ease-out with a touch of overshoot. */
export const easeOutSnappy = Easing.bezier(0.16, 1, 0.3, 1);

/** Default ease-out cubic — for everyday fades and slides. */
export const easeOut = Easing.out(Easing.cubic);

/** Smooth bidirectional ease — for press states. */
export const easeInOut = Easing.inOut(Easing.cubic);

/* ── Durations ──────────────────────────────────────────────────────── */

export const Duration = {
  fast: 200,
  base: 250,
  slow: 400,
  slower: 600,
} as const;

/* ── Pre-built reanimated configs ───────────────────────────────────── */

export const timingFast: WithTimingConfig = { duration: Duration.fast, easing: easeOutSnappy };
export const timingBase: WithTimingConfig = { duration: Duration.base, easing: easeOut };
export const timingSlow: WithTimingConfig = { duration: Duration.slow, easing: easeOut };

/** Standard press-down spring — `scale(0.98)` on press. */
export const pressSpring: WithSpringConfig = {
  damping: 22,
  stiffness: 380,
  mass: 0.7,
};

export const PRESS_SCALE = 0.98;
