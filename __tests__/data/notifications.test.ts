import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import {
  NOTIFICATION_PREFERENCE_KEYS,
  buildMarkReadBody,
  getNotificationPreferences,
  markNotificationsRead,
  pickPreferencePatch,
  resolveNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/data/notifications';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const patch = api.patch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  get.mockReset();
  patch.mockReset();
});

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('buildMarkReadBody', () => {
  it('sends { all: true } or a UUID-filtered, 200-capped id list', () => {
    expect(buildMarkReadBody('all')).toEqual({ all: true });
    expect(buildMarkReadBody([ID, 'not-a-uuid'])).toEqual({ ids: [ID] });
    const many = Array.from({ length: 250 }, () => ID);
    expect(buildMarkReadBody(many)).toEqual({ ids: many.slice(0, 200) });
  });
});

describe('resolveNotificationPreferences', () => {
  it('defaults every one of the 12 flags to ON when the row is missing', () => {
    expect(NOTIFICATION_PREFERENCE_KEYS).toHaveLength(12);
    const prefs = resolveNotificationPreferences(null);
    for (const key of NOTIFICATION_PREFERENCE_KEYS) expect(prefs[key]).toBe(true);
  });

  it('honours stored booleans and ignores bookkeeping columns', () => {
    const prefs = resolveNotificationPreferences({ user_id: 'u', push_enabled: false, milestone_email: false, updated_at: 'x' });
    expect(prefs.push_enabled).toBe(false);
    expect(prefs.milestone_email).toBe(false);
    expect(prefs.email_enabled).toBe(true);
    expect(Object.keys(prefs)).toHaveLength(12);
  });
});

describe('pickPreferencePatch', () => {
  it('keeps only known boolean flags', () => {
    expect(pickPreferencePatch({ push_enabled: false, sms_enabled: true, email_enabled: 'yes', user_id: 'u' })).toEqual({
      push_enabled: false,
    });
  });
});

describe('API calls', () => {
  it('markNotificationsRead PATCHes the body and skips an empty id list', async () => {
    patch.mockResolvedValue({ success: true });
    await markNotificationsRead('all');
    expect(patch).toHaveBeenCalledWith('/api/notifications', { all: true });
    await markNotificationsRead(['nope']);
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('getNotificationPreferences resolves defaults from a null row', async () => {
    get.mockResolvedValue({ preferences: null });
    const prefs = await getNotificationPreferences();
    expect(prefs.new_job_match_push).toBe(true);
    expect(get).toHaveBeenCalledWith('/api/notifications/preferences');
  });

  it('updateNotificationPreferences PATCHes only the allow-listed flags', async () => {
    patch.mockResolvedValue({ ok: true });
    await updateNotificationPreferences({ job_filled_email: false });
    expect(patch).toHaveBeenCalledWith('/api/notifications/preferences', { job_filled_email: false });
  });
});
