/**
 * AvailabilitySection — port of `~/bldesy-web/components/builder/availability-section.tsx`.
 *
 * Public "Availability" section — renders whichever display mode the tradie
 * chose. Hidden mode (and next_available with no date set) renders nothing.
 * Used by the portal's "Preview as homeowner" and by the public profile.
 * The section card mirrors the web's ProfileSection (`size="sm"`): rounded-2xl
 * surface card, p-5, 14px semibold title.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AvailabilityCalendar } from '@/components/availability/availability-calendar';
import { NextAvailableCallout } from '@/components/availability/next-available-callout';
import { Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatYmdShort } from '@/lib/web/dates';
import type { AvailabilityDisplayMode, OccupiedDates } from '@/types/database';

export function AvailabilitySection({
  mode,
  nextAvailableDate,
  occupiedDates,
  businessName,
  todayYmd,
}: {
  mode: AvailabilityDisplayMode;
  nextAvailableDate: string | null;
  occupiedDates: OccupiedDates | null;
  businessName: string;
  todayYmd: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  if (mode === 'hidden') return null;

  if (mode === 'next_available') {
    if (!nextAvailableDate) return null;
    return (
      <SectionCard title="Availability">
        <NextAvailableCallout date={nextAvailableDate} todayYmd={todayYmd} businessName={businessName} />
      </SectionCard>
    );
  }

  const dates = occupiedDates ?? {};
  const hasUpcomingBooked = Object.keys(dates).some((d) => d >= todayYmd);
  // Compact "next available" line above the grid — only for a current date;
  // a lapsed one adds nothing the calendar doesn't already say.
  const showNextAvailableLine = Boolean(nextAvailableDate && nextAvailableDate >= todayYmd);

  return (
    <SectionCard title="Availability">
      {showNextAvailableLine ? (
        <View style={[styles.nextLine, { borderColor: c.primary + '33', backgroundColor: c.primaryBg + '99' }]}>
          <Ionicons name="calendar-outline" size={14} color={c.primary} />
          <Text style={[styles.nextLabel, { color: c.primary }]}>Next available</Text>
          <Text style={[styles.nextDate, { color: c.textPrimary }]}>
            {formatYmdShort(nextAvailableDate as string, todayYmd)}
          </Text>
        </View>
      ) : null}
      <AvailabilityCalendar occupiedDates={dates} todayYmd={todayYmd} />
      {!hasUpcomingBooked ? (
        <Text style={[styles.note, { color: c.textSecondary, backgroundColor: c.canvas }]}>
          No booked dates marked yet — message {businessName} to confirm timing.
        </Text>
      ) : null}
    </SectionCard>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Card padding={Spacing.xl}>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        {title}
      </Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.lg,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.2,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  nextLine: {
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  nextLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  nextDate: {
    marginLeft: 'auto',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  note: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
});
