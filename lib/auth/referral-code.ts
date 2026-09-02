/**
 * Pending referral code — the app twin of the website's `bld_ref` cookie.
 *
 * A tradie who opens a share link (`bldesy://join?ref=BLD-7XK4Q`) may not sign
 * up straight away, so the code is parked in AsyncStorage for the same 30 days
 * the website's cookie lives, and forwarded on the web hand-off as
 * `join?ref=CODE` (lib/web-onboarding.ts) so the website's /join route drops
 * its own cookie before the wizard. Non-sensitive; re-validated server-side.
 *
 * Parsing lives in `lib/auth/referral-link.ts` (pure, unit-tested).
 */
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import { REFERRAL_COOKIE_MAX_AGE_SECONDS } from '@/lib/web/referrals/config';

import { normaliseReferralCode, parseReferralDeepLink } from './referral-link';

export const REFERRAL_STORAGE_KEY = 'bldesy_ref_code';

interface StoredReferral {
  code: string;
  savedAt: number;
}

/** Validate + persist. Returns the canonical code, or null if it was garbage. */
export async function savePendingReferralCode(raw: string | null | undefined): Promise<string | null> {
  const code = normaliseReferralCode(raw);
  if (!code) return null;
  try {
    const entry: StoredReferral = { code, savedAt: Date.now() };
    await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.warn('referral code save failed', e);
  }
  return code;
}

/** The pending code, or null when none is stored or it has aged out. */
export async function readPendingReferralCode(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<StoredReferral>;
    const code = normaliseReferralCode(entry.code);
    if (!code) return null;
    const ageMs = Date.now() - (typeof entry.savedAt === 'number' ? entry.savedAt : 0);
    if (ageMs > REFERRAL_COOKIE_MAX_AGE_SECONDS * 1000) {
      await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export async function clearPendingReferralCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Store the code carried by an incoming link, if it is a referral landing. */
export async function captureReferralFromUrl(url: string | null | undefined): Promise<string | null> {
  const code = parseReferralDeepLink(url);
  return code ? savePendingReferralCode(code) : null;
}

/**
 * Watch for a referral link — the one that launched the app and any that
 * arrive while it is open — and park the code. Mount it on the screens a
 * share link can land on (signup, welcome); it is idempotent.
 */
export function useReferralCapture(): void {
  useEffect(() => {
    let active = true;
    Linking.getInitialURL()
      .then((url) => {
        if (active) captureReferralFromUrl(url);
      })
      .catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => {
      captureReferralFromUrl(url);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
