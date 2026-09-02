/**
 * AvailabilityCalendar — port of
 * `~/bldesy-web/components/availability/availability-calendar.tsx`.
 *
 * The one availability calendar — read-only on the public profile, tappable
 * in the portal editor (`editable`). Month view, Monday-first, fixed 6-row
 * grid so navigation never shifts the layout. Booked days render as a soft
 * ink fill + dot: busy only, never job details.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MONTHS_AHEAD } from '@/lib/data/availability';
import { addMonths, formatYmdLong, monthGridDays, monthKey, monthLabel, monthOfYmd } from '@/lib/web/dates';
import type { DayOccupancy, OccupiedDates } from '@/types/database';

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL_HEIGHT = 44; // web h-11

interface AvailabilityCalendarProps {
  occupiedDates: OccupiedDates;
  /** "YYYY-MM-DD" — the device's today (injected so every caller agrees). */
  todayYmd: string;
  editable?: boolean;
  /** Editable taps: `next` is "full" to book the day, null to clear it. */
  onToggleDay?: (date: string, next: DayOccupancy | null) => void;
  /** Months navigable beyond the current one (12 visible months total). */
  monthsAhead?: number;
}

export function AvailabilityCalendar({
  occupiedDates,
  todayYmd,
  editable = false,
  onToggleDay,
  monthsAhead = MONTHS_AHEAD,
}: AvailabilityCalendarProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [month, setMonth] = useState(() => monthOfYmd(todayYmd));

  const currentKey = monthKey(month);
  const minKey = monthKey(monthOfYmd(todayYmd));
  const maxKey = monthKey(addMonths(monthOfYmd(todayYmd), monthsAhead));
  const canPrev = currentKey > minKey;
  const canNext = currentKey < maxKey;

  const cells = useMemo(() => monthGridDays(month), [month]);
  const rows = useMemo(() => {
    const out: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cells]);

  const days = cells.filter((d): d is string => d !== null);
  const bookedThisMonth = days.filter((d) => occupiedDates[d] && d >= todayYmd);

  function navigate(delta: 1 | -1) {
    if ((delta === 1 && !canNext) || (delta === -1 && !canPrev)) return;
    setMonth((m) => addMonths(m, delta));
  }

  const summary =
    bookedThisMonth.length === 0
      ? `No booked-out days in ${monthLabel(month)}.`
      : `Booked out in ${monthLabel(month)}: ${bookedThisMonth.map(formatYmdLong).join(', ')}.`;

  return (
    <View>
      {/* Month header: ‹ July 2026 › */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          disabled={!canPrev}
          onPress={() => navigate(-1)}
          style={({ pressed }) => [
            styles.navButton,
            { borderColor: c.border, backgroundColor: pressed ? c.canvas : 'transparent' },
            !canPrev && styles.navDisabled,
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={c.textSecondary} />
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={[styles.monthLabel, { color: c.textPrimary }]}>
          {monthLabel(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          disabled={!canNext}
          onPress={() => navigate(1)}
          style={({ pressed }) => [
            styles.navButton,
            { borderColor: c.border, backgroundColor: pressed ? c.canvas : 'transparent' },
            !canNext && styles.navDisabled,
          ]}
        >
          <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
        </Pressable>
      </View>

      {/* Weekday header */}
      <View aria-hidden style={styles.weekdays}>
        {WEEKDAY_LETTERS.map((letter, i) => (
          <Text key={i} style={[styles.weekday, { color: c.textSecondary + 'B3' }]}>
            {letter}
          </Text>
        ))}
      </View>

      {/* Day grid — keyed by month so navigation fades the whole grid in */}
      <Animated.View
        key={currentKey}
        entering={FadeIn.duration(150)}
        accessible={!editable}
        accessibilityLabel={!editable ? summary : undefined}
        style={styles.grid}
      >
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((ymd, i) => {
              if (!ymd) return <View key={`pad-${r}-${i}`} style={styles.cell} />;

              const isPast = ymd < todayYmd;
              const isToday = ymd === todayYmd;
              const isBusy = Boolean(occupiedDates[ymd]) && !isPast;
              const dayNumber = Number(ymd.slice(8));

              const textColor = isPast
                ? c.textPrimary + '4D'
                : isBusy
                  ? c.textSecondary
                  : isToday
                    ? c.primary
                    : c.textPrimary;
              const cellStyle = [
                styles.cell,
                styles.day,
                isBusy && { backgroundColor: c.textPrimary + '14' },
                isToday && { borderWidth: 1, borderColor: c.primary },
              ];
              const inner = (
                <>
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: textColor },
                      (isBusy || isToday) && styles.dayNumberEmphasis,
                    ]}
                  >
                    {dayNumber}
                  </Text>
                  <View style={[styles.dot, { backgroundColor: isBusy ? c.textSecondary : 'transparent' }]} />
                </>
              );

              if (!editable || isPast) {
                return (
                  <View key={ymd} style={cellStyle}>
                    {inner}
                  </View>
                );
              }

              return (
                <Pressable
                  key={ymd}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isBusy }}
                  accessibilityLabel={`${formatYmdLong(ymd)} — ${
                    isBusy ? 'booked, tap to mark available' : 'available, tap to mark booked'
                  }`}
                  onPress={() => onToggleDay?.(ymd, isBusy ? null : 'full')}
                  style={({ pressed }) => [
                    ...cellStyle,
                    pressed && { backgroundColor: isBusy ? c.textPrimary + '24' : c.primaryBg + 'B3' },
                  ]}
                >
                  {inner}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Legend */}
      <View aria-hidden style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }]} />
          <Text style={[styles.legendText, { color: c.textSecondary }]}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendBusy, { backgroundColor: c.textPrimary + '26' }]}>
            <View style={[styles.legendDot, { backgroundColor: c.textSecondary }]} />
          </View>
          <Text style={[styles.legendText, { color: c.textSecondary }]}>Booked</Text>
        </View>
        <View style={[styles.legendItem, styles.legendRight]}>
          <View style={[styles.legendSwatch, { borderWidth: 1, borderColor: c.primary }]} />
          <Text style={[styles.legendText, { color: c.textSecondary }]}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  weekdays: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  grid: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: Radius.md,
  },
  dayNumber: {
    fontSize: 14,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  dayNumberEmphasis: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendRight: {
    marginLeft: 'auto',
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendBusy: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
