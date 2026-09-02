/**
 * NextAvailableCallout — port of
 * `~/bldesy-web/components/availability/next-available-callout.tsx`.
 *
 * The "Next available" display — a designed teal callout, not a plain text
 * line. A date in the past truthfully reads as "Available now".
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatYmdShort } from '@/lib/web/dates';

export function NextAvailableCallout({
  date,
  todayYmd,
  businessName,
}: {
  date: string | null;
  todayYmd: string;
  businessName: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!date) return null;
  const isPast = date < todayYmd;

  return (
    <View style={[styles.callout, { borderColor: c.primary + '33', backgroundColor: c.primaryBg + '99' }]}>
      <View style={[styles.icon, { backgroundColor: c.primary + '1A' }]}>
        <Ionicons name="calendar-outline" size={20} color={c.primary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.eyebrow, { color: c.primary }]}>Next available</Text>
        <Text style={[styles.date, { color: c.textPrimary }]}>
          {isPast ? 'Available now' : formatYmdShort(date, todayYmd)}
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          {isPast ? `Get in touch with ${businessName} to confirm timing` : 'Earliest start for new work'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  date: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
});
