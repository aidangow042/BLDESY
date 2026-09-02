/**
 * lib/data/availability.ts — tradie availability (status, display mode,
 * next-available date, booked-out calendar).
 *
 * Port of:
 *   ~/bldesy-web/app/portal/availability/page.tsx            (pruneOccupied, MAX_OCCUPIED_ENTRIES,
 *                                                            toggleDay cap, suggestFromCalendar,
 *                                                            saveMode / saveNextDate / persistOccupied)
 *   ~/bldesy-web/components/availability/availability-calendar.tsx (12-month window, toggle semantics)
 *   ~/bldesy-web/app/portal/settings/page.tsx                 ("Work status" — availability enum)
 *   ~/bldesy-web/lib/dates.ts                                 (via the verbatim mirror)
 *
 * All dates are "YYYY-MM-DD" strings compared lexicographically — never
 * toISOString() (it shifts across midnight for UTC+ zones).
 */
import { db } from '@/lib/supabase';
import { addDaysYmd, addMonths, monthKey, monthOfYmd, monthStartYmd, ymdLocal } from '@/lib/web/dates';
import type {
  AvailabilityDisplayMode,
  AvailabilityStatus,
  Database,
  DayOccupancy,
  OccupiedDates,
} from '@/types/database';

import { requireUserId } from './own-session';
import type { OwnBuilderProfile } from './portal';

type AvailabilityUpdate = Pick<
  Database['public']['Tables']['builder_profiles']['Update'],
  'availability' | 'availability_display_mode' | 'next_available_date' | 'occupied_dates'
>;

/** Hard cap well under the DB's 16KB CHECK — a year of days is ~370 keys. */
export const MAX_OCCUPIED_ENTRIES = 380;
/** Months navigable beyond the current one (12 visible months total). */
export const MONTHS_AHEAD = 11;
/** Website debounce before a calendar edit is written. */
export const SAVE_DEBOUNCE_MS = 600;

export const AVAILABILITY_STATUSES: readonly AvailabilityStatus[] = ['available', 'limited', 'unavailable'];
export const AVAILABILITY_DISPLAY_MODES: readonly AvailabilityDisplayMode[] = [
  'hidden',
  'next_available',
  'calendar',
];

/** The website's toast when the calendar is full. */
export const OCCUPIED_LIMIT_MESSAGE = "That's the most booked dates the calendar can hold.";

/* ── Pure helpers ───────────────────────────────────────────────────── */

/** Device-local "today" as YYYY-MM-DD (the website's useDeviceToday). */
export function deviceTodayYmd(now: Date = new Date()): string {
  return ymdLocal(now);
}

/** Strict "YYYY-MM-DD" that round-trips through a real calendar date. */
export function isValidYmd(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isAvailabilityStatus(value: unknown): value is AvailabilityStatus {
  return typeof value === 'string' && (AVAILABILITY_STATUSES as readonly string[]).includes(value);
}

export function isAvailabilityDisplayMode(value: unknown): value is AvailabilityDisplayMode {
  return (
    typeof value === 'string' && (AVAILABILITY_DISPLAY_MODES as readonly string[]).includes(value)
  );
}

/**
 * Prune history (before the current month) and clamp to the 12-month window
 * so the JSONB never grows unbounded.
 */
export function pruneOccupied(dates: OccupiedDates, todayYmd: string): OccupiedDates {
  const min = monthStartYmd(monthOfYmd(todayYmd));
  const maxKey = monthKey(addMonths(monthOfYmd(todayYmd), MONTHS_AHEAD));
  const pruned: OccupiedDates = {};
  for (const [ymd, value] of Object.entries(dates)) {
    if (ymd >= min && monthKey(monthOfYmd(ymd)) <= maxKey) pruned[ymd] = value;
  }
  return pruned;
}

export type ToggleDayResult =
  | { ok: true; dates: OccupiedDates }
  | { ok: false; reason: 'limit'; message: string };

/**
 * Toggle one day: `next` is "full" to book it (v1 writes 'full' only; am/pm
 * are reserved) or null to clear it. Refuses past MAX_OCCUPIED_ENTRIES with
 * the website's message. Never mutates the input.
 */
export function toggleOccupiedDay(
  dates: OccupiedDates,
  date: string,
  next: DayOccupancy | null,
): ToggleDayResult {
  const updated: OccupiedDates = { ...dates };
  if (next === null) delete updated[date];
  else updated[date] = next;
  if (Object.keys(updated).length > MAX_OCCUPIED_ENTRIES) {
    return { ok: false, reason: 'limit', message: OCCUPIED_LIMIT_MESSAGE };
  }
  return { ok: true, dates: updated };
}

/** The calendar's tap: booked → clear, free → "full". */
export function nextOccupancyOnTap(dates: OccupiedDates, date: string, todayYmd: string): DayOccupancy | null {
  const isBusy = Boolean(dates[date]) && date >= todayYmd;
  return isBusy ? null : 'full';
}

/**
 * "Suggest from calendar": the first day after today that isn't booked
 * (scans up to a year ahead).
 */
export function suggestNextAvailable(dates: OccupiedDates, todayYmd: string): string {
  let candidate = addDaysYmd(todayYmd, 1);
  for (let i = 0; i < 366 && dates[candidate]; i++) {
    candidate = addDaysYmd(candidate, 1);
  }
  return candidate;
}

/** A saved next-available date that has already passed — visitors now see "Available now". */
export function isNextDateInPast(nextDate: string | null, todayYmd: string): boolean {
  return Boolean(nextDate && nextDate < todayYmd);
}

/** Booked days in a month that are today or later (the calendar's SR summary). */
export function bookedDaysFrom(dates: OccupiedDates, todayYmd: string): string[] {
  return Object.keys(dates)
    .filter((d) => d >= todayYmd)
    .sort();
}

/* ── Own-row IO ─────────────────────────────────────────────────────── */

export const AVAILABILITY_COLUMNS = [
  'availability',
  'availability_display_mode',
  'next_available_date',
  'occupied_dates',
] as const;

export type AvailabilitySettings = Pick<OwnBuilderProfile, (typeof AVAILABILITY_COLUMNS)[number]>;

/** The four availability columns of the own row. */
export async function getAvailabilitySettings(): Promise<AvailabilitySettings | null> {
  const uid = await requireUserId();
  const { data, error } = await db
    .from('builder_profiles')
    .select(AVAILABILITY_COLUMNS.join(', '))
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as AvailabilitySettings | null) ?? null;
}

async function updateOwn(patch: AvailabilityUpdate): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db.from('builder_profiles').update(patch).eq('user_id', uid);
  if (error) throw new Error(error.message);
}

/** Settings "Work status" pill: available / limited / unavailable. */
export async function saveAvailabilityStatus(status: AvailabilityStatus): Promise<void> {
  await updateOwn({ availability: status });
}

/** How availability renders publicly: hidden / next_available / calendar. */
export async function saveDisplayMode(mode: AvailabilityDisplayMode): Promise<void> {
  await updateOwn({ availability_display_mode: mode });
}

/** Next available date ("YYYY-MM-DD"), or null to clear. */
export async function saveNextAvailableDate(value: string | null): Promise<void> {
  if (value !== null && !isValidYmd(value)) throw new Error('Invalid date.');
  await updateOwn({ next_available_date: value });
}

/**
 * Persist the booked-out calendar, pruned to the current month → +11 months
 * window exactly as the website does before every write.
 */
export async function saveOccupiedDates(dates: OccupiedDates, todayYmd: string): Promise<OccupiedDates> {
  const pruned = pruneOccupied(dates, todayYmd);
  await updateOwn({ occupied_dates: pruned });
  return pruned;
}
