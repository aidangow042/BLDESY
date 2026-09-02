import { describe, expect, it } from 'vitest';

import {
  DELETE_ACCOUNT_COPY_HOMEOWNER,
  DELETE_ACCOUNT_COPY_ROLE,
  NOTIFICATION_TOGGLES,
  THEME_OPTIONS,
  deleteAccountCopy,
  hasPasswordIdentity,
  parseThemePreference,
  themeLabel,
  togglePatch,
  toggleValue,
} from '@/components/customer-dashboard/settings-model';
import type { NotificationPreferences } from '@/lib/data/notifications';

const allOn: NotificationPreferences = {
  email_enabled: true,
  push_enabled: true,
  new_job_match_email: true,
  new_job_match_push: true,
  new_application_email: true,
  new_application_push: true,
  job_filled_email: true,
  job_filled_push: true,
  job_expiring_email: true,
  job_expiring_push: true,
  milestone_email: true,
  milestone_push: true,
};

describe('appearance', () => {
  it('parses stored values and defaults to system', () => {
    expect(THEME_OPTIONS).toEqual(['light', 'dark', 'system']);
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('purple')).toBe('system');
  });

  it('labels are capitalised like the web', () => {
    expect(themeLabel('light')).toBe('Light');
    expect(themeLabel('system')).toBe('System');
  });
});

describe('notification toggles', () => {
  it('carry the web copy and map onto real preference keys', () => {
    expect(NOTIFICATION_TOGGLES.map((t) => [t.label, t.description])).toEqual([
      ['Job applications', 'Get notified when someone applies to your job'],
      ['Messages', 'Get notified about new messages'],
      ['Marketing', 'Tips, product updates and special offers'],
    ]);
    expect(NOTIFICATION_TOGGLES[0].prefKeys).toEqual(['new_application_email', 'new_application_push']);
    expect(NOTIFICATION_TOGGLES[1].prefKeys).toEqual(['email_enabled']);
    expect(NOTIFICATION_TOGGLES[2].prefKeys).toEqual(['milestone_email', 'milestone_push']);
  });

  it('reads ON when any channel is on and patches every channel', () => {
    const jobApps = NOTIFICATION_TOGGLES[0];
    expect(toggleValue(allOn, jobApps)).toBe(true);
    expect(toggleValue({ ...allOn, new_application_email: false, new_application_push: false }, jobApps)).toBe(false);
    expect(toggleValue({ ...allOn, new_application_email: false }, jobApps)).toBe(true);
    expect(togglePatch(jobApps, false)).toEqual({ new_application_email: false, new_application_push: false });
    expect(togglePatch(NOTIFICATION_TOGGLES[1], true)).toEqual({ email_enabled: true });
  });
});

describe('delete account copy', () => {
  it('varies by role', () => {
    expect(deleteAccountCopy(false, false)).toBe(DELETE_ACCOUNT_COPY_HOMEOWNER);
    expect(deleteAccountCopy(true, false)).toBe(DELETE_ACCOUNT_COPY_ROLE);
    expect(deleteAccountCopy(false, true)).toBe(DELETE_ACCOUNT_COPY_ROLE);
  });
});

describe('hasPasswordIdentity', () => {
  it('is true only for email/password identities', () => {
    expect(hasPasswordIdentity({ identities: [{ provider: 'email' }] })).toBe(true);
    expect(hasPasswordIdentity({ identities: [{ provider: 'phone' }] })).toBe(false);
    expect(hasPasswordIdentity({ identities: [{ provider: 'google' }, { provider: 'email' }] })).toBe(true);
    expect(hasPasswordIdentity({ identities: null })).toBe(false);
    expect(hasPasswordIdentity(null)).toBe(false);
  });
});
