/**
 * PopularTrades — 8-card grid linking to /trades/{slug}. Mirrors
 * `~/bldesy-web/components/home/popular-trades.tsx`. Tints come from theme's
 * trade-category tokens via `tradeColors()`.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, FontFamily, Radius, Spacing, tradeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TradeItem {
  slug: string;
  title: string;
  description: string;
  glyph: string;
}

const TRADES: TradeItem[] = [
  { slug: 'builder',     title: 'Builder',     description: 'New homes, renovations & extensions', glyph: '🏗️' },
  { slug: 'electrician', title: 'Electrician', description: 'Wiring, lighting & power',            glyph: '⚡' },
  { slug: 'plumber',     title: 'Plumber',     description: 'Pipes, taps & hot water',             glyph: '🚿' },
  { slug: 'carpenter',   title: 'Carpenter',   description: 'Decks, pergolas & joinery',           glyph: '🪚' },
  { slug: 'painter',     title: 'Painter',     description: 'Interior & exterior painting',        glyph: '🎨' },
  { slug: 'landscaper',  title: 'Landscaper',  description: 'Gardens, turf & outdoor spaces',      glyph: '🌿' },
  { slug: 'roofer',      title: 'Roofer',      description: 'Roof repairs & re-roofing',           glyph: '🏠' },
  { slug: 'tiler',       title: 'Tiler',       description: 'Bathroom, kitchen & floor tiling',    glyph: '🔲' },
];

export function PopularTrades() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: c.textPrimary }]}>Popular Trades</Text>
      <Text style={[styles.subheading, { color: c.textSecondary }]}>
        Find verified tradies across Australia&apos;s most in-demand trade categories.
      </Text>

      <View style={styles.grid}>
        {TRADES.map((trade) => {
          const tone = tradeColors(trade.slug, scheme);
          return (
            <Pressable
              key={trade.slug}
              onPress={() => router.push(`/results?trade=${trade.slug}` as any)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: tone.tint },
                ]}
              >
                <Text style={styles.iconGlyph}>{trade.glyph}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{trade.title}</Text>
              <Text style={[styles.cardDesc, { color: c.textSecondary }]} numberOfLines={2}>
                {trade.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/all-trades' as any)}
        style={styles.seeAll}
        hitSlop={4}
      >
        <Text style={[styles.seeAllText, { color: c.primary }]}>See all 50+ trades →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
    gap: Spacing.lg,
  },
  heading: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 22,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconGlyph: {
    fontSize: 18,
  },
  cardTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 15,
  },
  cardDesc: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
  },
  seeAll: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  seeAllText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 13,
  },
});
