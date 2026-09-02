/**
 * /portal/availability — port of `~/bldesy-web/app/portal/availability/page.tsx`.
 *
 * Display mode (hidden / next available / full calendar), the next-available
 * date, and the booked-dates calendar (600ms debounced writes, pruned to the
 * 12-month window), plus "Preview as homeowner" which renders exactly what the
 * public profile shows via AvailabilitySection.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AvailabilityCalendar } from '@/components/availability/availability-calendar';
import { AvailabilityModeControl } from '@/components/availability/availability-mode-control';
import { AvailabilitySection } from '@/components/builder/availability-section';
import { usePortal } from '@/components/portal/portal-context';
import { PortalPage } from '@/components/portal/portal-page';
import { Card, Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deviceTodayYmd,
  isNextDateInPast,
  saveDisplayMode,
  saveNextAvailableDate,
  saveOccupiedDates,
  SAVE_DEBOUNCE_MS,
  suggestNextAvailable,
  toggleOccupiedDay,
} from '@/lib/data/availability';
import type { OwnBuilderProfile } from '@/lib/data/portal';
import { ROUTES } from '@/lib/routes';
import { formatYmdLong, ymdLocal } from '@/lib/web/dates';
import type { AvailabilityDisplayMode, DayOccupancy, OccupiedDates } from '@/types/database';

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function AvailabilityEditorPage() {
  const { profile, refreshProfile } = usePortal();

  if (!profile) {
    return (
      <PortalPage>
        <Skeleton style={{ height: 32, width: 176 }} />
        <Skeleton variant="card" style={{ height: 160 }} />
        <Skeleton variant="card" style={{ height: 256 }} />
      </PortalPage>
    );
  }

  return <AvailabilityEditor profile={profile} refreshProfile={refreshProfile} />;
}

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function AvailabilityEditor({
  profile,
  refreshProfile,
}: {
  profile: OwnBuilderProfile;
  refreshProfile: () => Promise<void>;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [today] = useState(() => deviceTodayYmd());

  const [mode, setMode] = useState<AvailabilityDisplayMode>(profile.availability_display_mode ?? 'hidden');
  const [nextDate, setNextDate] = useState<string | null>(profile.next_available_date ?? null);
  const [draft, setDraft] = useState<OccupiedDates>(profile.occupied_dates ?? {});
  const [previewing, setPreviewing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [dateStatus, setDateStatus] = useState<SaveStatus>('idle');
  const [calStatus, setCalStatus] = useState<SaveStatus>('idle');

  // Refs for the debounce timer + unmount flush (written in handlers and
  // effects only — never during render).
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Persistence ─────────────────────────────────────────────── */

  async function saveMode(next: AvailabilityDisplayMode) {
    // Optimistic: the radio flips instantly, so the card highlight must too.
    const prev = mode;
    setMode(next);
    try {
      await saveDisplayMode(next);
    } catch (e) {
      setMode(prev);
      toast.show("Couldn't save your display mode — please try again.", { variant: 'error' });
      throw e;
    }
    void refreshProfile();
  }

  async function saveNextDate(value: string | null) {
    setNextDate(value);
    setDateStatus('saving');
    try {
      await saveNextAvailableDate(value);
    } catch {
      toast.show("Couldn't save that date — please try again.", { variant: 'error' });
      setDateStatus('idle');
      return;
    }
    setDateStatus('saved');
    if (dateStatusTimer.current) clearTimeout(dateStatusTimer.current);
    dateStatusTimer.current = setTimeout(() => setDateStatus('idle'), 1600);
    void refreshProfile();
  }

  const persistOccupied = async (dates: OccupiedDates) => {
    setCalStatus('saving');
    try {
      await saveOccupiedDates(dates, today);
    } catch {
      toast.show("Couldn't save your calendar — please try again.", { variant: 'error' });
      setCalStatus('idle');
      return; // stays dirty; the next toggle or flush retries the whole object
    }
    // Only mark clean while the object we just saved is still the latest.
    if (draftRef.current === dates) dirtyRef.current = false;
    setCalStatus('saved');
    if (calStatusTimer.current) clearTimeout(calStatusTimer.current);
    calStatusTimer.current = setTimeout(() => setCalStatus('idle'), 1600);
    void refreshProfile();
  };
  const persistRef = useRef(persistOccupied);
  useEffect(() => {
    persistRef.current = persistOccupied;
  });

  function toggleDay(date: string, next: DayOccupancy | null) {
    const result = toggleOccupiedDay(draft, date, next);
    if (!result.ok) {
      toast.show(result.message, { variant: 'error' });
      return;
    }
    setDraft(result.dates);
    draftRef.current = result.dates;
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persistRef.current(result.dates), SAVE_DEBOUNCE_MS);
  }

  // Flush a pending debounced save when the screen unmounts.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dateStatusTimer.current) clearTimeout(dateStatusTimer.current);
      if (calStatusTimer.current) clearTimeout(calStatusTimer.current);
      if (dirtyRef.current) void persistRef.current(draftRef.current);
    };
  }, []);

  function suggestFromCalendar() {
    void saveNextDate(suggestNextAvailable(draft, today));
  }

  function onPickerChange(e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios') setPickerOpen(false);
    if (e.type === 'set' && selected) void saveNextDate(ymdLocal(selected));
  }

  /* ── Render ──────────────────────────────────────────────────── */

  const dateInPast = isNextDateInPast(nextDate, today);
  const pickerValue = ymdToDate(nextDate && nextDate >= today ? nextDate : today);

  return (
    <PortalPage>
      {/* Page header */}
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
            Availability
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            Control how your availability appears to homeowners.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(ROUTES.builderProfile(profile.user_id))}
            style={[styles.headerButton, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={[styles.headerButtonText, { color: c.textPrimary }]}>View public profile</Text>
            <Ionicons name="open-outline" size={14} color={c.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: previewing }}
            onPress={() => setPreviewing((p) => !p)}
            style={[
              styles.headerButton,
              previewing
                ? { backgroundColor: c.primary, borderColor: c.primary }
                : { borderColor: c.border, backgroundColor: c.surface },
            ]}
          >
            <Ionicons name="eye-outline" size={16} color={previewing ? '#ffffff' : c.textPrimary} />
            <Text
              style={[
                styles.headerButtonText,
                styles.headerButtonTextStrong,
                { color: previewing ? '#ffffff' : c.textPrimary },
              ]}
            >
              {previewing ? 'Back to editing' : 'Preview as homeowner'}
            </Text>
          </Pressable>
        </View>
      </View>

      {previewing ? (
        /* ── Preview: exactly what the public profile renders ────── */
        <View style={styles.previewStack}>
          <View style={[styles.previewNote, { borderColor: c.primary + '40', backgroundColor: c.primaryBg + '99' }]}>
            <Ionicons name="eye-outline" size={16} color={c.primary} />
            <Text style={[styles.previewNoteText, { color: c.primary }]}>
              Previewing as a homeowner — this is exactly what your profile shows.
            </Text>
          </View>

          {mode === 'hidden' ? (
            <View style={[styles.previewEmpty, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={[styles.previewEmptyTitle, { color: c.textPrimary }]}>Homeowners see no availability</Text>
              <Text style={[styles.previewEmptySub, { color: c.textSecondary }]}>
                Your display mode is Hidden. Booked dates stay saved — switch modes any time.
              </Text>
            </View>
          ) : mode === 'next_available' && !nextDate ? (
            <View style={[styles.previewEmpty, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={[styles.previewEmptyTitle, { color: c.textPrimary }]}>Nothing to show yet</Text>
              <Text style={[styles.previewEmptySub, { color: c.textSecondary }]}>
                Next available mode needs a date — set one below and it appears here.
              </Text>
            </View>
          ) : (
            <AvailabilitySection
              mode={mode}
              nextAvailableDate={nextDate}
              occupiedDates={draft}
              businessName={profile.business_name}
              todayYmd={today}
            />
          )}
        </View>
      ) : (
        <>
          {/* ── 1. Display mode ─────────────────────────────────── */}
          <Card padding={Spacing.xl} flat>
            <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
              How it appears on your profile
            </Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>
              Availability is hidden by default — choose what homeowners see.
            </Text>
            <View style={styles.sectionBody}>
              <AvailabilityModeControl value={mode} onChange={saveMode} />
            </View>
          </Card>

          {/* ── 2. Next available date ──────────────────────────── */}
          <Card padding={Spacing.xl} flat>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
                Next available date
              </Text>
              <SaveTick status={dateStatus} />
            </View>
            <Text style={[styles.sub, { color: c.textSecondary }]}>
              Shown when your display mode is “Next available”.
            </Text>

            <View style={styles.dateRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next available date"
                onPress={() => setPickerOpen(true)}
                style={[styles.dateInput, { borderColor: c.border, backgroundColor: c.surface }]}
              >
                <Text style={[styles.dateInputText, { color: nextDate ? c.textPrimary : c.textSecondary + '99' }]}>
                  {nextDate ? formatYmdLong(nextDate) : 'dd/mm/yyyy'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={suggestFromCalendar}
                style={[styles.dateButton, { borderColor: c.border, backgroundColor: c.surface }]}
              >
                <Text style={[styles.dateButtonText, { color: c.textPrimary }]}>Suggest from calendar</Text>
              </Pressable>
              {nextDate ? (
                <Pressable accessibilityRole="button" onPress={() => void saveNextDate(null)} style={styles.clearButton}>
                  <Text style={[styles.dateButtonText, { color: c.textSecondary }]}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            {dateInPast ? (
              <View style={[styles.warning, { borderColor: c.warning + '4D', backgroundColor: c.warning + '0D' }]}>
                <Ionicons name="warning-outline" size={14} color={c.warning} style={styles.warningIcon} />
                <Text style={[styles.warningText, { color: c.warning }]}>
                  This date has passed — visitors now see “Available now”. Pick a new date or clear it.
                </Text>
              </View>
            ) : null}
            {mode === 'hidden' ? (
              <Text style={[styles.hint, { color: c.textSecondary }]}>
                Saved, but not public — your display mode is Hidden.
              </Text>
            ) : null}
            {mode === 'calendar' ? (
              <Text style={[styles.hint, { color: c.textSecondary }]}>
                Also shown as a small line above your public calendar.
              </Text>
            ) : null}
          </Card>

          {/* ── 3. Booked dates calendar ────────────────────────── */}
          <Card padding={Spacing.xl} flat>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
                Booked dates
              </Text>
              <SaveTick status={calStatus} />
            </View>
            <Text style={[styles.sub, { color: c.textSecondary }]}>
              Homeowners only ever see “Booked” — never the job or client.
            </Text>

            <View style={[styles.calendarBox, { borderColor: c.primary + '66', backgroundColor: c.primaryBg + '33' }]}>
              <View style={styles.editingRow}>
                <Ionicons name="pencil-outline" size={14} color={c.primary} />
                <Text style={[styles.editingText, { color: c.primary }]}>Editing — tap dates to mark them booked</Text>
              </View>
              <AvailabilityCalendar occupiedDates={draft} todayYmd={today} editable onToggleDay={toggleDay} />
            </View>

            {mode !== 'calendar' ? (
              <Text style={[styles.hint, { color: c.textSecondary }]}>
                Saved, but not public — switch your display mode to “Full calendar” to show it.
              </Text>
            ) : null}
          </Card>
        </>
      )}

      {/* Native date picker: Android shows the system dialog, iOS an inline sheet. */}
      {pickerOpen && Platform.OS === 'android' ? (
        <DateTimePicker value={pickerValue} mode="date" minimumDate={ymdToDate(today)} onChange={onPickerChange} />
      ) : null}
      {Platform.OS === 'ios' ? (
        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} accessibilityLabel="Close" />
            <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.md }]}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="inline"
                minimumDate={ymdToDate(today)}
                accentColor={c.primary}
                onChange={onPickerChange}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setPickerOpen(false)}
                style={[styles.doneButton, { backgroundColor: c.primary }]}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </PortalPage>
  );
}

function SaveTick({ status }: { status: SaveStatus }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View accessibilityLiveRegion="polite" style={styles.tick}>
      {status === 'saving' ? <Text style={[styles.tickText, { color: c.textSecondary }]}>Saving…</Text> : null}
      {status === 'saved' ? (
        <Text style={[styles.tickText, styles.tickSaved, { color: c.primary }]}>✓ Saved</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.md,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  h2: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  headerButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  headerButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  headerButtonTextStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  previewStack: {
    gap: Spacing.lg,
  },
  previewNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  previewNoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  previewEmpty: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  previewEmptyTitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  previewEmptySub: {
    marginTop: Spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  sectionBody: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  tick: {
    minHeight: 16,
  },
  tickText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  tickSaved: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  dateRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  dateInput: {
    height: 44,
    minWidth: 160,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  dateButton: {
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  clearButton: {
    height: 44,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  warning: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  warningIcon: {
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  hint: {
    marginTop: Spacing.md,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  calendarBox: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing.md,
  },
  editingRow: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editingText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  doneButton: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  doneText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
