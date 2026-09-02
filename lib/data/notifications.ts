/**
 * Notifications — typed client for ~/bldesy-web/app/api/notifications/route.ts
 * (GET list + unread count, PATCH mark read) and
 * ~/bldesy-web/app/api/notifications/preferences/route.ts (GET/PATCH the
 * email/push channel + per-category flags).
 *
 * Preferences rows are created lazily by the dispatcher and RLS only permits
 * self SELECT/UPDATE, so both routes go through the website (admin upsert);
 * a missing row means every flag defaults ON, matching the dispatcher. SMS
 * alerts are NOT here — they're `builder_profiles.sms_alerts_enabled`, an
 * own-row write the portal settings module owns.
 */
import { api } from '@/lib/api';
import type { NotificationType } from '@/types/database';

export type { NotificationType };

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationsPage {
  /** Newest first, max 30. */
  notifications: NotificationRow[];
  unreadCount: number;
}

/** The 12 boolean flags the preferences route allow-lists (verbatim PREF_KEYS). */
export const NOTIFICATION_PREFERENCE_KEYS = [
  'email_enabled',
  'push_enabled',
  'new_job_match_email',
  'new_job_match_push',
  'new_application_email',
  'new_application_push',
  'job_filled_email',
  'job_filled_push',
  'job_expiring_email',
  'job_expiring_push',
  'milestone_email',
  'milestone_push',
] as const;

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];
export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

/** The stored row as the API returns it (`select *`): the flags plus bookkeeping columns. */
export type NotificationPreferencesRow = Partial<NotificationPreferences> & {
  user_id?: string;
  [column: string]: unknown;
};

export type MarkReadTarget = 'all' | string[];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/** `{ all: true }` or `{ ids }` — ids filtered to UUIDs and capped at 200 like the route. */
export function buildMarkReadBody(target: MarkReadTarget): { all: true } | { ids: string[] } {
  if (target === 'all') return { all: true };
  return { ids: target.filter((id) => UUID_RE.test(id)).slice(0, 200) };
}

/** Missing row / missing key = ON, matching the dispatcher's own defaults. */
export function resolveNotificationPreferences(
  row: NotificationPreferencesRow | null | undefined,
): NotificationPreferences {
  const out = {} as NotificationPreferences;
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    const value = row?.[key];
    out[key] = typeof value === 'boolean' ? value : true;
  }
  return out;
}

/** Allow-list a patch to known boolean flags (anything else is dropped, as the route does). */
export function pickPreferencePatch(patch: Record<string, unknown>): Partial<NotificationPreferences> {
  const out: Partial<NotificationPreferences> = {};
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    if (typeof patch[key] === 'boolean') out[key] = patch[key] as boolean;
  }
  return out;
}

/* ───────────────────────────── API ───────────────────────────── */

/** The caller's latest 30 notifications + unread count. */
export async function listNotifications(): Promise<NotificationsPage> {
  return api.get<NotificationsPage>('/api/notifications');
}

/** Mark specific notifications (or all unread) as read — persisted server-side. */
export async function markNotificationsRead(target: MarkReadTarget): Promise<void> {
  const body = buildMarkReadBody(target);
  if ('ids' in body && body.ids.length === 0) return;
  await api.patch<{ success: true }>('/api/notifications', body);
}

/** Resolved preferences (all 12 flags; missing row = defaults ON). */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api.get<{ preferences: NotificationPreferencesRow | null }>(
    '/api/notifications/preferences',
  );
  return resolveNotificationPreferences(res.preferences);
}

/**
 * Save changed flags. Rejects with the route's 400 "No valid fields" when the
 * patch carries nothing known — callers should send only what changed.
 */
export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<void> {
  await api.patch<{ ok: true }>('/api/notifications/preferences', pickPreferencePatch(patch));
}
