/**
 * CoverageCta — port of ~/bldesy-web/components/coverage/coverage-cta.tsx.
 * Renders between the search and the map once a search resolves. No tradie
 * counts, no invented numbers: "spots are being filled" is the strongest claim
 * allowed here. The amber button is the homeowner conversion accent.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { zoneForSuburb } from '@/lib/web/coverage-map/config';

import { useCoverage } from './coverage-context';

interface CoverageCtaProps {
  onClear: () => void;
  /** Scrolls the screen to the waitlist form. */
  onJoin: () => void;
}

export function CoverageCta({ onClear, onJoin }: CoverageCtaProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { result } = useCoverage();

  if (!result) return null;

  const zone = result.zoneSlug ? zoneForSuburb(result.label) : null;
  const covered = Boolean(zone);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        covered
          ? { borderColor: c.primary + '4D', backgroundColor: scheme === 'dark' ? c.primary + '1A' : c.primaryBg }
          : { borderColor: c.border, backgroundColor: c.canvas },
      ]}
    >
      <Text style={[styles.eyebrow, { color: covered ? c.primary : c.textSecondary }]}>
        {covered ? "You're in a founding neighbourhood" : 'Not in a founding neighbourhood yet'}
      </Text>
      <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
        {covered ? `${result.label} is in ${zone!.name}.` : `${result.label} isn’t in a founding neighbourhood yet.`}
      </Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>
        {covered
          ? 'Tradie spots in this area are being filled right now. Join the waitlist and we’ll text you the day verified tradies are live in your suburb.'
          : 'We’re starting in Inner Sydney and opening up from there. You can still join — and plenty of verified tradies travel, so you’ll still be able to contact them at launch.'}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onJoin}
          style={({ pressed }) => [
            styles.join,
            Shadows.md,
            { backgroundColor: pressed ? c.ctaDark : c.cta },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.joinLabel}>{covered ? 'Join the waitlist' : 'Join the waitlist anyway'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8}>
          <Text style={[styles.clear, { color: c.textSecondary }]}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  join: {
    height: 44,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
  clear: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
