/**
 * /search — ~/bldesy-web/app/search/page.tsx. One screen, two states keyed off
 * the params (`trade, location, urgency, keywords, specialisations, show`, plus
 * `sort, page, verified, licensed_in`):
 *
 *   • no query → the SearchForm, then the same fill as the homepage overlay
 *     (HowItWorksTabs + TradieSignupBand)
 *   • query → the teal results header, the sort/filter bar, 12 cards a page
 *     with the credentials disclaimer, pagination; the demand-capture wall on
 *     0 results; the error state when the query itself failed.
 *
 * Filters, sort and pagination are URL-driven (`router.setParams`), exactly as
 * on the web. `search_performed` fires once per distinct query (incl. 0 rows —
 * that's the unmet-demand signal); it is skipped when the query errored.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { HowItWorksTabs } from '@/components/home/how-it-works-tabs';
import { AppShell } from '@/components/layout';
import { BuilderResults } from '@/components/search/builder-results';
import { Pagination } from '@/components/search/pagination';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchForm } from '@/components/search/search-form';
import {
  hasSearchQuery,
  parseSearchQuery,
  searchHref,
  splitList,
  tradeNamesFor,
  withPage,
  type ParamPatch,
} from '@/components/search/search-params';
import { SearchResultsHeader } from '@/components/search/search-results-header';
import { TradieSignupBand } from '@/components/search/tradie-signup-band';
import { Button, Skeleton } from '@/components/ui';
import { WaitlistSearchFallback } from '@/components/waitlist';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PAGE_SIZE, searchBuilders } from '@/lib/data/search';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { ROUTES } from '@/lib/routes';
import { supplyContextFor } from '@/lib/web/launch-zones';
import { getTradeBySlug } from '@/lib/web/trades';
import type { BuilderSearchResult } from '@/types';

type ResultsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; builders: BuilderSearchResult[]; total: number };

export default function SearchScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Record<string, string>>();
  const scrollRef = useRef<ScrollView>(null);

  const query = useMemo(() => parseSearchQuery(params), [params]);
  const queryKey = JSON.stringify(query);
  const showResults = hasSearchQuery(query);

  const [results, setResults] = useState<ResultsState>({ status: 'loading' });

  useEffect(() => {
    if (!showResults) return;
    let cancelled = false;
    setResults({ status: 'loading' });
    const q = parseSearchQuery(params);
    searchBuilders({
      trade: q.trade,
      location: q.location,
      urgency: q.urgency,
      keywords: q.keywords,
      specialisations: q.specialisations,
      verified: q.verified || undefined,
      licensed_in: q.licensed_in || undefined,
      sort: q.sort,
      page: q.page,
    }).then((res) => {
      if (cancelled) return;
      if (res.error) {
        setResults({ status: 'error' });
        return;
      }
      setResults({ status: 'ready', builders: res.builders, total: res.total });
      // Demand-side signal — fires even on 0 results (that's the point).
      trackFunnelEvent(
        'search_performed',
        {
          trade: q.trade ?? null,
          location: q.location ?? null,
          urgency: q.urgency ?? null,
          keyword_count: splitList(q.keywords).length,
          specialisation_count: splitList(q.specialisations).length,
          verified: q.verified,
          sort: q.sort,
          page: q.page,
          total: res.total,
        },
        { path: '/search' },
      );
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => {
      cancelled = true;
    };
    // queryKey captures every param the query reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, showResults]);

  function applyPatch(patch: ParamPatch) {
    router.setParams(patch as Record<string, string | undefined>);
  }

  function newSearch() {
    router.replace(ROUTES.search as Href);
  }

  if (!showResults) {
    // Empty state (no query yet): the form, then the same "How BLDESY works"
    // section the homepage uses plus the slim tradie-recruitment band.
    return (
      <AppShell showBack>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom }}>
          <SearchForm />
          <HowItWorksTabs />
          <TradieSignupBand />
        </ScrollView>
      </AppShell>
    );
  }

  const firstTrade = query.trade?.split(',')[0];
  const trade = firstTrade ? getTradeBySlug(firstTrade) : undefined;
  const tradeNames = tradeNamesFor(query.trade);
  const keywords = splitList(query.keywords);
  const total = results.status === 'ready' ? results.total : 0;
  const builders = results.status === 'ready' ? results.builders : [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppShell showBack>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing['3xl'] }}
      >
        <SearchResultsHeader trade={tradeNames} location={query.location} total={total} keywords={keywords} onNewSearch={newSearch} />

        <View style={styles.body}>
          {/* Sort tabs are pointless on 0 results, but the filter panel must stay
              reachable — it's the only way to un-apply a filter that emptied them. */}
          <SearchFilters params={params} hideSort={results.status !== 'loading' && builders.length === 0} onPatch={applyPatch} />

          {results.status === 'loading' ? (
            <View style={styles.skeletons}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="card" style={{ height: 320 }} />
              ))}
            </View>
          ) : results.status === 'error' ? (
            <View style={styles.centre}>
              <View style={[styles.iconBubble, { backgroundColor: c.errorBg }]}>
                <Ionicons name="warning-outline" size={28} color={c.error} />
              </View>
              <Text accessibilityRole="header" style={[styles.stateTitle, { color: c.textPrimary }]}>
                Couldn&apos;t load results
              </Text>
              <Text style={[styles.stateCopy, { color: c.textSecondary }]}>
                Something went wrong while searching. Please try again.
              </Text>
              <Button
                variant="primary"
                onPress={() =>
                  router.replace(searchHref({ trade: query.trade, location: query.location, show: 'results' }) as Href)
                }
              >
                Try Again
              </Button>
            </View>
          ) : builders.length > 0 ? (
            <>
              <BuilderResults builders={builders} />
              <Pagination currentPage={query.page} totalPages={totalPages} onPage={(page) => applyPatch(withPage(params, page))} />
            </>
          ) : (
            /* Empty state — capture the demand instead of dead-ending. */
            <View style={styles.emptyWrap}>
              {/* No suburbSlug: `location` is raw free text, so slugifying it could
                  mint a landing URL that 404s — the wall's trade links fall back
                  to the national landings. */}
              <WaitlistSearchFallback
                trade={trade?.slug}
                tradeName={trade?.name}
                suburb={query.location}
                supply={supplyContextFor(trade?.slug, query.location)}
              />
              <View style={styles.centre}>
                <Text style={[styles.stateCopy, { color: c.textSecondary }]}>
                  Or try a different location, broader trade, or fewer filters.
                </Text>
                <Button variant="primary" onPress={newSearch}>
                  New Search
                </Button>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },
  skeletons: {
    gap: Spacing.xl,
  },
  centre: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 18,
  },
  stateCopy: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 448,
    marginBottom: Spacing.sm,
  },
  emptyWrap: {
    paddingVertical: Spacing.xl,
  },
});
