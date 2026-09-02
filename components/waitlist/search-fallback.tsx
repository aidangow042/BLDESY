/**
 * WaitlistSearchFallback — port of
 * ~/bldesy-web/components/waitlist/search-fallback.tsx: the demand-capture
 * block shown where results would be (the search empty state and the
 * trade × suburb landings with no supply). Turns "no tradies here yet" into a
 * waitlist signup that records the trade + suburb we couldn't serve.
 *
 * TWO STATES, ONE COMPONENT:
 *  · PRE-LAUNCH (`supply` absent or state "prelaunch") — "We're rolling out
 *    suburb by suburb, join the list."
 *  · POST-OPEN (state "unstocked") — the zone is live and this trade isn't:
 *    names what IS live, and where a stocked trade genuinely covers the job it
 *    says so, including where that cover stops.
 * State "stocked" means the caller shouldn't be rendering a wall at all; it
 * falls back to the pre-launch copy rather than throwing.
 *
 * Deviation from the web: the form sits on a hard-coded WHITE card (the
 * WaitlistForm palette is forced-light), not `bg-surface`.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { FunnelBeacon } from '@/components/marketing/funnel-beacon';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';
import type { SupplyContext } from '@/lib/web/launch-zones';
import { pluralNameFor, pluralSlugFor, type Trade } from '@/lib/web/trades';

import { DRAW_PRIZE_FLOOR_COPY } from './draw-prize';
import { LaunchBadge } from './launch-badge';
import { LiveBadge } from './live-badge';
import { WL } from './palette';
import { capitalise, fallbackNouns, liveTradeSentence, resolveTrade } from './search-fallback-copy';
import { WaitlistForm } from './waitlist-form';
import { WhatYouGet } from './what-you-get';

export interface WaitlistSearchFallbackProps {
  /** The trade searched for — a slug or a Trade record. */
  trade?: string | Trade;
  /** Display name to fall back on when `trade` is not a known slug. */
  tradeName?: string;
  /** The searched suburb/location, as the visitor typed it. */
  suburb?: string;
  /** The RESOLVED suburb slug when the caller has one — used only to build live-trade links. */
  suburbSlug?: string;
  /** Resolved by the caller via supplyContextFor(); defaults to pre-launch. */
  supply?: SupplyContext;
}

export function WaitlistSearchFallback({ trade, tradeName, suburb, suburbSlug, supply }: WaitlistSearchFallbackProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const resolved = resolveTrade(trade);
  const tradeSlug = resolved?.slug;
  const { who, oneOf } = fallbackNouns(resolved, tradeName ?? (typeof trade === 'string' ? undefined : trade?.name));
  const where = suburb?.trim() || 'your area';
  const postOpen = supply?.state === 'unstocked' ? supply : null;

  // The web links to /{plural}/{suburb} when a suburb slug is known, else the national landing.
  function tradeHref(t: Trade): Href {
    const plural = pluralSlugFor(t);
    return (suburbSlug ? ROUTES.tradeSuburb(plural, suburbSlug) : ROUTES.tradeLanding(plural)) as Href;
  }

  return (
    <View style={styles.root}>
      <FunnelBeacon
        event="waitlist_page_landed"
        meta={{
          source: 'search_miss',
          // Which wall fired, so the two are separable in /funnels.
          wall: postOpen ? 'trade_unstocked' : 'prelaunch',
          ...(postOpen ? { zone: postOpen.zone.slug } : {}),
          ...(tradeSlug ? { trade: tradeSlug } : {}),
        }}
      />

      {/* The situation — honest about supply, immediately reframed as an offer. */}
      <View style={styles.intro}>
        {postOpen ? <LiveBadge zoneName={postOpen.zone.name} /> : <LaunchBadge tone="onLight" />}
        <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
          No verified {who} in {where} yet
        </Text>
        {postOpen ? (
          <>
            <Text style={[styles.body, { color: c.textSecondary }]}>
              {where} opened with {liveTradeSentence(postOpen.liveTrades)}. {capitalise(who)} aren&apos;t on the
              books here yet — and we won&apos;t list one until they&apos;ve passed all five checks, so today
              there&apos;s nothing to show you rather than a name we can&apos;t stand behind. Leave the job with us
              and we&apos;ll be in touch the day a verified {oneOf} covers {where}.
            </Text>
            {postOpen.covered ? (
              <Text style={[styles.body, { color: c.textSecondary, marginTop: Spacing.md }]}>
                <Text style={[styles.strong, { color: c.textPrimary }]}>Might be sorted already:</Text> our{' '}
                <Text
                  accessibilityRole="link"
                  onPress={() => router.push(tradeHref(postOpen.covered!.trade))}
                  style={[styles.strong, { color: c.primary }]}
                >
                  {pluralNameFor(postOpen.covered.trade).toLowerCase()} in {where}
                </Text>{' '}
                {/* The limit is stated verbatim from COVERED_BY.partial. */}
                {postOpen.covered.partial
                  ? `do ${postOpen.covered.partial}. If that's the job, it can be sorted today.`
                  : 'handle that kind of work.'}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={[styles.body, { color: c.textSecondary }]}>
            We only list tradies once they&apos;re checked five ways — and we&apos;re rolling out suburb by suburb.
            Join the waitlist and your job is first in line the day verified {who} go live near you. Answer the job
            question and you&apos;re in the draw for {DRAW_PRIZE_FLOOR_COPY}.
          </Text>
        )}
      </View>

      {/* Form first, promises underneath (the web's below-lg order). */}
      <View style={styles.formCard}>
        <WaitlistForm
          source="search_miss"
          defaultTrade={tradeSlug ?? ''}
          defaultSuburb={suburb ?? ''}
          // The same two values, but as the immutable record of what they asked
          // for — an edit to the fields must not erase the miss.
          searchedTrade={tradeSlug}
          searchedSuburb={suburb}
          title={postOpen ? 'Tell us the job' : 'Be first in line'}
          subtitle={
            postOpen
              ? `Suburb plus an email or mobile is all it takes — we'll be in touch the moment a verified ${oneOf} covers ${where}.`
              : `Suburb + email or mobile is all it takes — we'll contact you the moment ${who} go live in ${where}.`
          }
        />
      </View>

      {postOpen ? (
        <View style={[styles.liveCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.liveTitle, { color: c.textPrimary }]}>Live in {where} right now</Text>
          <View style={styles.liveList}>
            {postOpen.liveTrades.map((t) => (
              <Pressable key={t.slug} accessibilityRole="link" onPress={() => router.push(tradeHref(t))} hitSlop={4}>
                <Text style={[styles.liveLink, { color: c.primary }]}>{pluralNameFor(t)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <WhatYouGet />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing['3xl'],
  },
  intro: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  body: {
    maxWidth: 560,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  strong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: WL.cardBorder,
    backgroundColor: WL.white,
    padding: Spacing['2xl'],
    shadowColor: '#0D7C66',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  liveCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  liveTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  liveList: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  liveLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
});
