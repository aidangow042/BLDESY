/**
 * Settings page — pure helpers (no React Native imports so they unit-test
 * under vitest): the Appearance preference, the notification toggle → API key
 * mapping, the Delete Account copy variants and the password-identity check.
 * Port of the logic in ~/bldesy-web/app/settings/page.tsx.
 */
import type { NotificationPreferenceKey, NotificationPreferences } from '@/lib/data/notifications';

/* ── Appearance ─────────────────────────────────────────────────────── */

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_OPTIONS: readonly ThemePreference[] = ['light', 'dark', 'system'];

/** AsyncStorage key (the web keeps `theme_preference` in localStorage). */
export const THEME_PREFERENCE_KEY = 'bldesy_theme';

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

/** The web renders the option with `capitalize` → "Light" / "Dark" / "System". */
export function themeLabel(option: ThemePreference): string {
  return option.charAt(0).toUpperCase() + option.slice(1);
}

/* ── Notifications ──────────────────────────────────────────────────── */

export type SettingsToggleKey = 'job_applications' | 'messages' | 'marketing';

export interface SettingsNotificationToggle {
  key: SettingsToggleKey;
  label: string;
  description: string;
  /** The /api/notifications/preferences flags this toggle writes. */
  prefKeys: readonly NotificationPreferenceKey[];
}

/**
 * The web page's three toggles (localStorage only there) mapped onto the real
 * preferences route: Job applications → new_application_*, Messages →
 * email_enabled (the master email channel — message alerts have no category
 * flag), Marketing → milestone_*.
 */
export const NOTIFICATION_TOGGLES: readonly SettingsNotificationToggle[] = [
  {
    key: 'job_applications',
    label: 'Job applications',
    description: 'Get notified when someone applies to your job',
    prefKeys: ['new_application_email', 'new_application_push'],
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Get notified about new messages',
    prefKeys: ['email_enabled'],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Tips, product updates and special offers',
    prefKeys: ['milestone_email', 'milestone_push'],
  },
];

/** A toggle reads ON when any of its channels is on. */
export function toggleValue(prefs: NotificationPreferences, toggle: SettingsNotificationToggle): boolean {
  return toggle.prefKeys.some((key) => prefs[key]);
}

/** The patch that flips every channel behind a toggle. */
export function togglePatch(toggle: SettingsNotificationToggle, value: boolean): Partial<NotificationPreferences> {
  const patch: Partial<NotificationPreferences> = {};
  for (const key of toggle.prefKeys) patch[key] = value;
  return patch;
}

/* ── Delete account ─────────────────────────────────────────────────── */

export const DELETE_ACCOUNT_COPY_ROLE =
  "Permanently remove your account, including any tradie or enterprise profile. Cancel your subscription first if you have one — Stripe charges aren't refundable. This cannot be undone.";
export const DELETE_ACCOUNT_COPY_HOMEOWNER =
  "BLDESY! is free for homeowners — there's no subscription to cancel. If you'd like to remove your account, you can delete it permanently here. This cannot be undone.";

export function deleteAccountCopy(isBuilder: boolean, isEnterprise: boolean): string {
  return isBuilder || isEnterprise ? DELETE_ACCOUNT_COPY_ROLE : DELETE_ACCOUNT_COPY_HOMEOWNER;
}

/* ── Password ───────────────────────────────────────────────────────── */

/** Only email/password identities can change a password (phone-only / Google accounts cannot). */
export function hasPasswordIdentity(user: { identities?: { provider: string }[] | null } | null | undefined): boolean {
  return Boolean(user?.identities?.some((identity) => identity.provider === 'email'));
}
