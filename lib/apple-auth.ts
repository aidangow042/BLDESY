/**
 * Sign in with Apple (native) → Supabase session.
 *
 * Required by App Store Guideline 4.8 because the app offers a third-party
 * login. Uses the native Apple flow (expo-apple-authentication) and exchanges
 * the returned identity token for a Supabase session via signInWithIdToken.
 *
 * Backend: the Supabase "Apple" auth provider must list this app's bundle id
 * (com.bldesy.app) as an authorized client id (see SETUP note at bottom).
 *
 * Only works on a real iOS device in a dev/TestFlight/App Store build — NOT in
 * Expo Go (the native module isn't included there).
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { supabase } from './supabase';

export type AppleSignInResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** True only on iOS where Sign in with Apple is supported. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    // Apple receives the SHA-256 of a random nonce; Supabase verifies the raw
    // nonce against the hash embedded in the identity token (replay protection).
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { status: 'error', message: 'Apple did not return an identity token.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) return { status: 'error', message: error.message };

    // Apple only returns the user's name on the FIRST authorization. Persist it
    // to the profile so the account isn't left nameless.
    const fullName = credential.fullName;
    if (fullName && (fullName.givenName || fullName.familyName)) {
      const name = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim();
      if (name) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ name }).eq('id', user.id);
        }
      }
    }

    return { status: 'success' };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return { status: 'cancelled' };
    return { status: 'error', message: e?.message ?? 'Apple sign-in failed.' };
  }
}

/*
 * SETUP (one-time, outside code):
 *   1. Apple Developer → enable "Sign In with Apple" capability for the app id
 *      com.bldesy.app (the expo-apple-authentication plugin adds the entitlement
 *      to the build; the capability must exist on the App ID).
 *   2. Supabase → Authentication → Providers → Apple: add `com.bldesy.app` to
 *      the "Authorized Client IDs" list (alongside the website's Services ID).
 *      The native flow authenticates with the bundle id as the audience, so it
 *      must be allow-listed or signInWithIdToken returns an audience error.
 */
