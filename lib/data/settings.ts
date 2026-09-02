/**
 * lib/data/settings.ts — tradie account settings.
 *
 * Port of:
 *   ~/bldesy-web/app/portal/settings/page.tsx     (SMS alerts, password change, delete account,
 *                                                  delete tradie data; pause lives in lib/data/portal)
 *   ~/bldesy-web/components/auth/phone-link.tsx   (updateUser({ phone }) + verifyOtp phone_change)
 *   ~/bldesy-web/components/auth/email-link.tsx   (updateUser({ email }) + verifyOtp email_change)
 *   ~/bldesy-web/app/api/auth/change-password     POST { currentPassword, newPassword } → { ok }
 *   ~/bldesy-web/app/api/auth/delete-account      POST { password } → { ok } · 401 wrong pw · 422 phone-only/OAuth
 *   ~/bldesy-web/app/api/builder/delete-profile   POST → { ok }
 *   DELETE /api/me/application?kind=builder|enterprise → { ok } · 409 code "active"
 *
 * Blocked users are NOT duplicated here — reuse lib/blocking.ts (re-exported below).
 */
import { api, ApiError } from '@/lib/api';
import { dispatchProfileChanged } from '@/lib/events/profile';
import { db, supabase } from '@/lib/supabase';
import { isValidAuMobile, normaliseE164 } from '@/lib/web/phone';

import { requireUserId } from './own-session';

export {
  blockUser,
  getBlockedIds,
  getMutualBlockIds,
  isBlockedEitherWay,
  unblockUser,
} from '@/lib/blocking';

/* ── Strings (verbatim from the website components) ─────────────────── */

export const ERR_SMS_PHONE_REQUIRED = 'Add a valid Australian mobile number first.';
export const ERR_AU_MOBILE = 'Enter a valid Australian mobile number (e.g. 0412 345 678).';
export const ERR_SAVE_RETRY = "Couldn't save — please try again.";
export const ERR_CURRENT_PASSWORD_REQUIRED = 'Enter your current password.';
export const ERR_PASSWORD_MIN = 'Password must be at least 8 characters.';
export const ERR_PASSWORD_MISMATCH = 'Passwords do not match.';
export const ERR_PASSWORD_UPDATE = "Couldn't update your password. Please try again.";
export const ERR_PHONE_TAKEN = 'That mobile is already linked to another account.';
export const ERR_EMAIL_TAKEN = 'That email is already linked to another account.';
export const ERR_SEND_CODE = "Couldn't send a code. Please try again.";
export const ERR_PHONE_CODE_REQUIRED = 'Enter the code we texted you.';
export const ERR_EMAIL_CODE_REQUIRED = 'Enter the code from the email we sent you.';
export const ERR_CODE_INVALID = 'That code is incorrect or has expired.';
export const ERR_EMAIL_INVALID = 'Enter a valid email address.';
export const ERR_DELETE_ACCOUNT_FAILED = 'Failed to delete account.';
export const ERR_DELETE_PROFILE_FAILED = "Couldn't delete your tradie data. Please try again.";

/** The website's 422 for phone-only / Google accounts (support path). */
export const DELETE_ACCOUNT_UNSUPPORTED_MESSAGE =
  'Account deletion currently requires an email + password. Please contact support to delete a phone-only or Google account.';

/** The website's 409 when deleting an application that is already live. */
export const APPLICATION_ACTIVE_MESSAGE =
  'Your application is active. Delete your account from Settings if you really want to remove it.';

export const PASSWORD_MIN_LENGTH = 8;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RE = /^\d{4,8}$/;

/* ── Typed errors ───────────────────────────────────────────────────── */

/** Self-delete is not available for this identity type (HTTP 422) — point at support. */
export class AccountDeletionUnsupportedError extends Error {
  readonly status = 422 as const;

  constructor(message: string = DELETE_ACCOUNT_UNSUPPORTED_MESSAGE) {
    super(message);
    this.name = 'AccountDeletionUnsupportedError';
  }
}

/** The pending application is already active (HTTP 409, code "active"). */
export class ApplicationActiveError extends Error {
  readonly status = 409 as const;
  readonly code = 'active' as const;

  constructor(message: string = APPLICATION_ACTIVE_MESSAGE) {
    super(message);
    this.name = 'ApplicationActiveError';
  }
}

/* ── SMS job alerts (own row) ───────────────────────────────────────── */

/**
 * Toggle SMS job alerts. Enabling requires a valid AU mobile; the number is
 * saved alongside the flag so server-side dispatch always has one to text.
 */
export async function setSmsAlerts(enabled: boolean, phone: string): Promise<void> {
  if (enabled && !isValidAuMobile(phone)) throw new Error(ERR_SMS_PHONE_REQUIRED);
  const uid = await requireUserId();
  const { error } = await db
    .from('builder_profiles')
    .update({ sms_alerts_enabled: enabled, ...(enabled ? { phone: phone.trim() } : {}) })
    .eq('user_id', uid);
  if (error) throw new Error(ERR_SAVE_RETRY);
  dispatchProfileChanged();
}

/** Save just the mobile number (without flipping the toggle). */
export async function saveSmsPhone(phone: string): Promise<void> {
  if (!isValidAuMobile(phone)) throw new Error(ERR_AU_MOBILE);
  const uid = await requireUserId();
  const { error } = await db
    .from('builder_profiles')
    .update({ phone: phone.trim() })
    .eq('user_id', uid);
  if (error) throw new Error(ERR_SAVE_RETRY);
  dispatchProfileChanged();
}

/* ── Password ───────────────────────────────────────────────────────── */

/** The settings form's client-side checks, in order. Null = OK. */
export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string = newPassword,
): string | null {
  if (!currentPassword) return ERR_CURRENT_PASSWORD_REQUIRED;
  if (newPassword.length < PASSWORD_MIN_LENGTH) return ERR_PASSWORD_MIN;
  if (newPassword !== confirmPassword) return ERR_PASSWORD_MISMATCH;
  return null;
}

/**
 * Change the password with a fresh current-password re-check server-side.
 * Throws ApiError with the route's message (401 wrong / never set → the
 * "use Forgot password" hint; 400 length/same-as-current).
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const invalid = validatePasswordChange(currentPassword, newPassword);
  if (invalid) throw new Error(invalid);
  await api.post<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword });
}

/* ── Account deletion ───────────────────────────────────────────────── */

/**
 * Permanently delete the account (cascades to every row). Re-verifies the
 * password server-side. 422 → AccountDeletionUnsupportedError (phone-only /
 * Google accounts); 401 → ApiError "Password is incorrect.". On success the
 * local session is signed out.
 */
export async function deleteAccount(password: string): Promise<void> {
  try {
    await api.post<{ ok: true }>('/api/auth/delete-account', { password });
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      throw new AccountDeletionUnsupportedError(e.message || DELETE_ACCOUNT_UNSUPPORTED_MESSAGE);
    }
    throw e;
  }
  await supabase.auth.signOut();
}

/**
 * "Cancel & delete my tradie data": cancels the tradie subscription then
 * removes the builder_profiles row, keeping the account (unified-profile
 * model). Side-scoped — an enterprise subscription is untouched.
 */
export async function deleteBuilderProfile(): Promise<void> {
  await api.post<{ ok: true }>('/api/builder/delete-profile');
  dispatchProfileChanged();
}

/**
 * Withdraw a PENDING tradie/enterprise application. 409 (already active) →
 * ApplicationActiveError with the website's copy.
 */
export async function deleteMyApplication(kind: 'builder' | 'enterprise'): Promise<void> {
  try {
    await api.delete<{ ok: true }>(`/api/me/application?kind=${kind}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      throw new ApplicationActiveError(e.message || APPLICATION_ACTIVE_MESSAGE);
    }
    throw e;
  }
  dispatchProfileChanged();
}

/* ── Phone login (phone-link.tsx) ───────────────────────────────────── */

/** Map a Supabase updateUser({ phone }) failure to the website's copy. */
export function phoneUpdateErrorMessage(message: string | undefined): string {
  // "phone_exists" => the number is attached to a different account.
  return /exists/i.test(message ?? '') ? ERR_PHONE_TAKEN : ERR_SEND_CODE;
}

/** Map a Supabase updateUser({ email }) failure to the website's copy. */
export function emailUpdateErrorMessage(message: string | undefined): string {
  return /exists|registered/i.test(message ?? '') ? ERR_EMAIL_TAKEN : ERR_SEND_CODE;
}

/**
 * Attach a mobile to the CURRENT account so the user can log in by phone:
 * Supabase texts an OTP via the send hook. Returns the E.164 digits (no "+")
 * the verify step must pass back. Safe unguarded — Supabase enforces its own
 * per-user OTP limits and the caller is authenticated.
 */
export async function startPhoneChange(phone: string): Promise<string> {
  const e164 = normaliseE164(phone);
  if (!e164) throw new Error(ERR_AU_MOBILE);
  // Supabase expects E.164 with a leading "+".
  const { error } = await supabase.auth.updateUser({ phone: `+${e164}` });
  if (error) throw new Error(phoneUpdateErrorMessage(error.message));
  return e164;
}

/** Confirm the texted code → writes auth.users.phone. */
export async function verifyPhoneChange(phone: string, token: string): Promise<void> {
  const e164 = normaliseE164(phone);
  const code = token.trim();
  if (!e164 || !OTP_RE.test(code)) throw new Error(ERR_PHONE_CODE_REQUIRED);
  const { error } = await supabase.auth.verifyOtp({ phone: `+${e164}`, token: code, type: 'phone_change' });
  if (error) throw new Error(ERR_CODE_INVALID);
}

/* ── Email link (email-link.tsx) ────────────────────────────────────── */

/** Attach a verified email to a phone-only account: Supabase emails a code. */
export async function startEmailChange(email: string): Promise<string> {
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) throw new Error(ERR_EMAIL_INVALID);
  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw new Error(emailUpdateErrorMessage(error.message));
  return trimmed;
}

/** Confirm the emailed code → writes auth.users.email. */
export async function verifyEmailChange(email: string, token: string): Promise<void> {
  const trimmed = email.trim();
  const code = token.trim();
  if (!OTP_RE.test(code)) throw new Error(ERR_EMAIL_CODE_REQUIRED);
  const { error } = await supabase.auth.verifyOtp({ email: trimmed, token: code, type: 'email_change' });
  if (error) throw new Error(ERR_CODE_INVALID);
}
