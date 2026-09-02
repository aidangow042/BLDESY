/**
 * Server-side bookkeeping for a brand-new account.
 *
 * The website records these inside its signup action / phone-verify route
 * (profiles upsert, clickwrap terms acceptance, `account_created` funnel
 * event). The app has no server of its own, so once a session exists it asks
 * the website to do the same via `/api/auth/post-signup`. Best effort: a
 * failure is logged and never blocks the user — the root layout's
 * `ensureProfileRow` covers the profiles row regardless.
 */
import { api } from '@/lib/api';

export type PostSignupMethod = 'email' | 'phone';

export interface PostSignupInput {
  method: PostSignupMethod;
  /** Display name typed on the form (OAuth accounts leave it to the provider metadata). */
  name?: string;
}

export async function recordPostSignup({ method, name }: PostSignupInput): Promise<void> {
  try {
    await api.post('/api/auth/post-signup', {
      method,
      ...(name ? { name } : {}),
      termsAccepted: true,
    });
  } catch (e) {
    console.warn('post-signup bookkeeping failed', e instanceof Error ? e.message : e);
  }
}
