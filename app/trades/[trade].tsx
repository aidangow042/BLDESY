/**
 * /trades/[trade] — ~/bldesy-web/app/[trade]/page.tsx (launch branch): the
 * national trade landing. Teal hero with the five-checks paragraph and the
 * compact SearchBar, "{Plural} by area" city pills, the top six verified
 * profiles with the live count, and the "Have a job in mind?" CTA. Accepts the
 * plural (web URL) or singular slug.
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
import { nationalIntroCopy, peopleNounFor, resolveTradeSegment, verifiedHeading } from '@/components/trades/trade-copy';
import { Button, Skeleton } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { countSearchableBuildersNear, searchBuilders } from '@/lib/data/search';
import { ROUTES } from '@/lib/routes';
import { getAllMajorLocations } from '@/lib/web/locations';
import { pluralNameFor, pluralSlugFor } from '@/lib/web/trades';
import type { BuilderSearchResult } from '@/types';

export default function TradeLandingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { trade: seg } = useLocalSearchParams<{ trade: string }>();
  const trade = resolveTradeSegment(seg);

  const [count, setCount] = useState<number | null>(null);
  const [builders, setBuilders] = useState<BuilderSearchResult[] | null>(null);

  useEffect(() => {
    if (!trade) return;
    let cancelled = false;
    setBuilders(null);
    Promise.all([countSearchableBuildersNear({ trade: trade.slug }), searchBuilders({ trade: trade.slug })]).then(
      ([n, res]) => {
        if (cancelled) return;
        setCount(n);
        setBuilders(res.builders.slice(0, 6));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [trade]);

  if (!trade) {
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

  const people = peopleNounFor(trade);
  const plural = pluralNameFor(trade);
  const cities = getAllMajorLocations();
  const heading = verifiedHeading(trade, count);
  const searchAll = searchHref({ trade: trade.slug }) as Href;

  return (
    <AppShell showBack>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <LinearGradient colors={[c.gradientHeaderFrom, c.gradientHeaderTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text accessibilityRole="header" style={styles.h1}>
            {plural} in Australia
          </Text>
          <Text style={styles.intro}>{nationalIntroCopy(trade)}</Text>
          <View style={styles.searchBox}>
            <SearchBar defaultTrade={trade.slug} />
          </View>
        </LinearGradient>

        {/* ── Browse by city ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
            {plural} by area
          </Text>
          <View style={styles.pillWrap}>
            {cities.map((city) => (
              <Pressable
                key={city.slug}
                accessibilityRole="link"
                onPress={() => router.push(ROUTES.tradeSuburb(pluralSlugFor(trade), city.slug) as Href)}
                style={({ pressed }) => [
                  styles.pill,
                  { backgroundColor: c.surface, borderColor: pressed ? c.primary : c.border },
                ]}
              >
                <Text style={[styles.pillText, { color: c.textSecondary }]}>
                  {city.name}, {city.state}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Top profiles nationally ──────────────────────────── */}
        {builders === null ? (
          <View style={[styles.section, { gap: Spacing.lg }]}>
            <Skeleton variant="text" style={{ width: '60%', height: 24 }} />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </View>
        ) : builders.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={[styles.h2, styles.flex1, { color: c.textPrimary }]}>
                {heading.title}
                {heading.meta ? <Text style={[styles.meta, { color: c.textSecondary }]}> {heading.meta}</Text> : null}
              </Text>
              <Pressable accessibilityRole="link" onPress={() => router.push(searchAll)} hitSlop={6}>
                <Text style={[styles.seeAll, { color: c.primary }]}>See all →</Text>
              </Pressable>
            </View>
            <View style={styles.cards}>
              {builders.map((b) => (
                <BuilderCard key={b.user_id} builder={b} />
              ))}
              <CredentialsDisclaimer />
            </View>
          </View>
        ) : null}

        {/* ── CTA ──────────────────────────────────────────────── */}
        <View style={[styles.section, styles.cta]}>
          <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary, textAlign: 'center' }]}>
            Have a job in mind?
          </Text>
          <Text style={[styles.ctaCopy, { color: c.textSecondary }]}>
            Post it free and verified {people.toLowerCase()} near you will get in touch.
          </Text>
          <View style={styles.ctaRow}>
            <Button variant="primary" size="lg" onPress={() => router.push(ROUTES.postJob as Href)}>
              Post a job
            </Button>
            <Button variant="ghost" size="lg" onPress={() => router.push(searchAll)}>
              Browse profiles
            </Button>
          </View>
        </View>

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
    maxWidth: 512,
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
  h2: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: Spacing.lg,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: 16,
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  seeAll: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  cards: {
    gap: Spacing['2xl'],
  },
  cta: {
    alignItems: 'center',
    paddingTop: 0,
  },
  ctaCopy: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
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
