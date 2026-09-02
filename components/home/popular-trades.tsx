/**
 * PopularTrades — ~/bldesy-web/components/home/popular-trades.tsx, THE FRONT
 * DOOR: the six trades BLDESY launches with (lib/web/launch-trades.ts) as
 * gradient tiles, then the "seventh door" band for an unstocked job — captured
 * instead of bounced. Copy verbatim; the CTA label is the launch-mode
 * "Find a tradie".
 */
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FeatureShaderCards } from '@/components/home/feature-shader-cards';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';
import { launchTrades, type LaunchTradeSlug } from '@/lib/web/launch-trades';
import { COVERAGE } from '@/lib/web/service-areas';
import { pluralSlugFor } from '@/lib/web/trades';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** The web's inline SVGs, as the closest Ionicons glyphs. */
const TRADE_ICONS: Record<LaunchTradeSlug, IoniconName> = {
  plumber: 'water-outline',
  electrician: 'flash-outline',
  handyman: 'construct-outline',
  carpenter: 'hammer-outline',
  painter: 'color-palette-outline',
  plasterer: 'layers-outline',
};

/** Blurbs name the JOBS people actually search for, not the trade's own jargon. */
const TILE_BLURB: Record<LaunchTradeSlug, string> = {
  plumber: 'Leaks, hot water & blocked drains',
  electrician: 'Power, lights & switchboards',
  handyman: 'Odd jobs & small repairs',
  carpenter: 'Decks, doors & custom joinery',
  painter: 'Interiors, exteriors & repaints',
  plasterer: 'Patching, cornices & rendering',
};

export function PopularTrades() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const tiles = launchTrades().map((trade) => {
    const slug = trade.slug as LaunchTradeSlug;
    return {
      title: trade.name,
      description: TILE_BLURB[slug],
      icon: TRADE_ICONS[slug],
      onPress: () => router.push(ROUTES.tradeLanding(pluralSlugFor(trade)) as Href),
    };
  });

  return (
    <>
      <FeatureShaderCards
        features={tiles}
        heading="The six trades we're launching with"
        subheading={`Inner Sydney first — ${COVERAGE.line}. Every tradie checked five ways before they can take your job.`}
        ctaLabel="Find a tradie"
      />

      {/* The seventh door — a full-width band, deliberately NOT a seventh tile. */}
      <View style={styles.bandWrap}>
        <View style={[styles.band, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.bandTitle, { color: c.textPrimary }]}>Need something else?</Text>
          <Text style={[styles.bandCopy, { color: c.textSecondary }]}>
            Tiler, cleaner, landscaper, air con, roofer — 50+ trades are on the list, and which ones we verify next is
            decided by what people ask for. Tell us the trade and your suburb.
          </Text>
          <View style={styles.bandLinks}>
            <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.waitlist as Href)} hitSlop={6} style={styles.linkRow}>
              <Text style={[styles.primaryLink, { color: c.primary }]}>Tell us what you need</Text>
              <Ionicons name="arrow-forward" size={16} color={c.primary} />
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.trades as Href)} hitSlop={6}>
              <Text style={[styles.secondaryLink, { color: c.textSecondary }]}>See all 50+ trades</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bandWrap: {
    marginTop: -Spacing['4xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  band: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  bandTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  bandCopy: {
    marginTop: 6,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 512,
  },
  bandLinks: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: Spacing['2xl'],
    rowGap: Spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
});
