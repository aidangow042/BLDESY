/**
 * /trades/[trade]/[suburb] — ~/bldesy-web/app/[trade]/[suburb]/page.tsx: the
 * trade × suburb landing. Hero with the rotating intro copy and the compact
 * SearchBar; the verified profiles servicing the suburb, or the demand-capture
 * wall when nothing renders; then the "{Plural} near {suburb}" and "Other
 * trades in {suburb}" link bands. Gating keys off the RENDERED listings, not
 * the bounding-box count.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AppShell, Footer } from '@/components/layout';
import { BuilderCard } from '@/components/search/builder-card';
import { CredentialsDisclaimer } from '@/components/search/credentials-disclaimer';
import { searchHref } from '@/components/search/search-params';
import { SearchBar } from '@/components/trades/search-bar';
import { introCopy, otherLaunchTrades, peopleNounFor, placeLabel, resolveTradeSegment } from '@/components/trades/trade-copy';
import { Button, Skeleton } from '@/components/ui';
import { WaitlistSearchFallback } from '@/components/waitlist';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { countSearchableBuildersNear, searchBuilders } from '@/lib/data/search';
import { ROUTES } from '@/lib/routes';
import { supplyContextFor } from '@/lib/web/launch-zones';
import { nearbySuburbs, resolveSuburbSlug, stateForSuburb, type SuburbEntry } from '@/lib/web/suburbs';
import { pluralNameFor, pluralSlugFor, type Trade } from '@/lib/web/trades';
import type { BuilderSearchResult } from '@/types';

interface PageData {
  entry: SuburbEntry | null;
  state: string | null;
  nearby: SuburbEntry[];
  count: number | null;
  builders: BuilderSearchResult[];
}

export default function TradeSuburbScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { trade: tradeSeg, suburb: suburbSeg } = useLocalSearchParams<{ trade: string; suburb: string }>();
  const trade = resolveTradeSegment(tradeSeg);
  const suburbSlug = suburbSeg?.trim().toLowerCase() ?? '';

  const [data, setData] = useState<PageData | null>(null);

  useEffect(() => {
    if (!trade || !suburbSlug) return;
    let cancelled = false;
    setData(null);
    (async () => {
      // In-memory slug resolution (16k localities, lazily indexed) runs off the
      // render path so the first paint isn't blocked.
      const entry = resolveSuburbSlug(suburbSlug);
      if (!entry) {
        if (!cancelled) setData({ entry: null, state: null, nearby: [], count: null, builders: [] });
        return;
      }
      const count = await countSearchableBuildersNear({ trade: trade.slug, location: entry.key });
      // Skipped when the count is a hard zero — nothing for it to find.
      const { builders } = count === 0 ? { builders: [] } : await searchBuilders({ trade: trade.slug, location: entry.key });
      if (cancelled) return;
      setData({ entry, state: stateForSuburb(entry), nearby: nearbySuburbs(entry, 8), count, builders });
    })();
    return () => {
      cancelled = true;
    };
  }, [trade, suburbSlug]);

  if (!trade || (data && !data.entry)) {
    return (
      <AppShell showBack>
        <View style={styles.notFound}>
          <Text accessibilityRole="header" style={[styles.notFoundTitle, { color: c.textPrimary }]}>
            Page Not Found
          </Text>
          <Button variant="primary" onPress={() => router.replace(ROUTES.trades as Href)}>
            All Trades
          </Button>
        </View>
      </AppShell>
    );
  }

  const plural = pluralNameFor(trade);

  if (!data || !data.entry) {
    return (
      <AppShell showBack>
        <View style={[styles.section, { gap: Spacing.lg }]}>
          <Skeleton variant="text" style={{ width: '70%', height: 28 }} />
          <Skeleton variant="text" />
          <Skeleton variant="text" style={{ width: '80%' }} />
          <Skeleton variant="card" />
        </View>
      </AppShell>
    );
  }

  const { entry, state, nearby, count, builders } = data;
  const gated = builders.length === 0;
  const people = peopleNounFor(trade);
  const searchLink = searchHref({ trade: trade.slug, location: entry.name }) as Href;
  const otherTrades = otherLaunchTrades(trade.slug);

  const suburbHref = (t: Trade, slug: string) => ROUTES.tradeSuburb(pluralSlugFor(t), slug) as Href;

  return (
    <AppShell showBack>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <LinearGradient colors={[c.gradientHeaderFrom, c.gradientHeaderTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text accessibilityRole="header" style={styles.h1}>
            {plural} in {placeLabel(entry)}
          </Text>
          <Text style={styles.intro}>{introCopy(trade, entry, state, count, nearby)}</Text>
          <View style={styles.searchBox}>
            <SearchBar defaultTrade={trade.slug} defaultLocation={entry.name} />
          </View>
        </LinearGradient>

        {gated ? (
          <View style={styles.section}>
            <WaitlistSearchFallback
              trade={trade}
              tradeName={trade.name}
              suburb={entry.name}
              suburbSlug={entry.slug}
              supply={supplyContextFor(trade.slug, entry.name)}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={[styles.h2, styles.flex1, { color: c.textPrimary }]}>
                Verified {people.toLowerCase()} servicing {entry.name}
              </Text>
              <Pressable accessibilityRole="link" onPress={() => router.push(searchLink)} hitSlop={6}>
                <Text style={[styles.link, { color: c.primary }]}>Filter &amp; compare all →</Text>
              </Pressable>
            </View>
            <View style={styles.cards}>
              {builders.map((b) => (
                <BuilderCard key={b.user_id} builder={b} />
              ))}
              <CredentialsDisclaimer />
            </View>
            <View style={styles.ctaRow}>
              <Button variant="primary" size="lg" onPress={() => router.push(ROUTES.postJob as Href)}>
                Post a job — free
              </Button>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(searchLink)}
                style={({ pressed }) => [styles.browseAll, { borderColor: c.border, backgroundColor: pressed ? c.surface : 'transparent' }]}
              >
                <Text style={[styles.browseAllText, { color: c.textPrimary }]}>Browse all {people.toLowerCase()} →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Internal links ───────────────────────────────────── */}
        {nearby.length > 0 || otherTrades.length > 0 ? (
          <View style={[styles.links, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            {nearby.length > 0 ? (
              <View>
                <Text accessibilityRole="header" style={[styles.h3, { color: c.textPrimary }]}>
                  {plural} near {entry.name}
                </Text>
                <View style={styles.pillWrap}>
                  {nearby.map((n) => (
                    <Pressable
                      key={n.slug}
                      accessibilityRole="link"
                      onPress={() => router.push(suburbHref(trade, n.slug))}
                      style={({ pressed }) => [styles.pill, { backgroundColor: c.canvas, borderColor: pressed ? c.primary : c.border }]}
                    >
                      <Text style={[styles.pillText, { color: c.textSecondary }]}>
                        {plural} in {n.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {otherTrades.length > 0 ? (
              <View>
                <Text accessibilityRole="header" style={[styles.h3, { color: c.textPrimary }]}>
                  Other trades in {entry.name}
                </Text>
                <View style={styles.pillWrap}>
                  {otherTrades.map((t) => (
                    <Pressable
                      key={t.slug}
                      accessibilityRole="link"
                      onPress={() => router.push(suburbHref(t, entry.slug))}
                      style={({ pressed }) => [styles.pill, { backgroundColor: c.canvas, borderColor: pressed ? c.primary : c.border }]}
                    >
                      <Text style={[styles.pillText, { color: c.textSecondary }]}>
                        {pluralNameFor(t)} in {entry.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <Footer />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 56,
    alignItems: 'center',
  },
  h1: {
    fontFamily: FontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  intro: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
  },
  searchBox: {
    alignSelf: 'stretch',
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['5xl'],
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  flex1: {
    flex: 1,
  },
  h2: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 30,
  },
  h3: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  link: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  cards: {
    gap: Spacing['2xl'],
  },
  ctaRow: {
    marginTop: Spacing['4xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  browseAll: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseAllText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  links: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['4xl'],
    gap: Spacing['3xl'],
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing['2xl'],
  },
  notFoundTitle: {
    fontFamily: FontFamily.display,
    fontSize: 24,
  },
});
