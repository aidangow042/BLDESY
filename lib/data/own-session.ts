/**
 * Session helpers shared by the lib/data modules — the app-side stand-in for
 * the `supabase.auth.getUser()` call at the top of every website portal page
 * and route handler. One definition so every own-row read/write keys on the
 * same user id.
 *
 * Anonymous sessions are deliberately NOT rejected here: the website's
 * no-signup tradie wizard creates builder_profiles rows owned by an anonymous
 * auth user, and /portal/pending must be able to read them (see
 * app/portal/pending/page.tsx "activate" branch).
 */
import type { User } from '@supabase/supabase-js';

import { db } from '@/lib/supabase';

/** The website's own string — lib/actions/capabilities.ts, lib/actions/referrals.ts. */
export const NOT_SIGNED_IN = 'Not signed in.';

/** Current session user, or null when signed out. */
export async function getSessionUser(): Promise<User | null> {
  const { data } = await db.auth.getSession();
  return data.session?.user ?? null;
}

/** Current session user; throws the website's "Not signed in." when there is none. */
export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error(NOT_SIGNED_IN);
  return user;
}

/** Convenience for owner-scoped queries: the session user's id. */
export async function requireUserId(): Promise<string> {
  return (await requireSessionUser()).id;
}
