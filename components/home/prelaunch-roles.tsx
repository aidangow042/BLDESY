/**
 * PrelaunchRoles — ~/bldesy-web/components/home/prelaunch-roles.tsx, the
 * tradie-recruitment section. In launch mode it sits below Popular Trades.
 * The proof chip's count (searchable tradies) is fetched on mount and the
 * display floor applied HERE: below the floor the chip is hidden entirely,
 * never shown small.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GetStartedTwoDoor } from '@/components/home/get-started-two-door';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { countSearchableBuildersNear } from '@/lib/data/search';

const TRADIE_CHIP_FLOOR = 10;

/** Apply the display floor: null hides the chip (a small count reads as weak social proof). */
export function tradieChipCount(raw: number | null): number | null {
  return raw !== null && raw >= TRADIE_CHIP_FLOOR ? raw : null;
}

export function PrelaunchRoles() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [tradieCount, setTradieCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    countSearchableBuildersNear({}).then((raw) => {
      if (!cancelled) setTradieCount(tradieChipCount(raw));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.section, { backgroundColor: c.canvas }]}>
      <View style={styles.header}>
        <View style={[styles.eyebrow, { backgroundColor: c.primaryBg }]}>
          <Text style={[styles.eyebrowText, { color: c.primary }]}>For tradies</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Lock in founding access
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Get verified before launch — free until 3 homeowners contact you, founding rates locked for good.
        </Text>
      </View>

      <GetStartedTwoDoor tradieCount={tradieCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  header: {
    alignItems: 'center',
  },
  eyebrow: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  h2: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  sub: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
