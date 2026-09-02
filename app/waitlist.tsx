/**
 * /waitlist — port of ~/bldesy-web/app/waitlist/page.tsx (LIVE branch):
 * the flat brand-green hero (trust chips, the five-checks line, the value-led
 * headline, the draw pill) over the WaitlistFlow card that overlaps it.
 *
 * Not ported: the social-proof count ("N homeowners already waiting") — a
 * server-side admin read the app has no endpoint for; the web hides it below
 * SOCIAL_PROOF_MIN anyway. The live draw prize is likewise a server read, so
 * the copy uses the floor figure, which the draw-prize helpers treat as
 * always-true.
 *
 * Deep links mirror the web's query params: ?trade= ?suburb= ?src=gate ?mate=.
 */
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppShell } from '@/components/layout';
import { Footer } from '@/components/layout/footer';
import { CHECK_PATH, FunnelBeacon, GIFT_PATH, HeroIcon } from '@/components/marketing';
import { WaitlistFlow } from '@/components/waitlist';
import { DRAW_LIVE, DRAW_NAME, LEGACY_PRIZE_AUD, formatDrawPrize } from '@/components/waitlist/draw-prize';
import { WL } from '@/components/waitlist/palette';
import { normaliseMateCode } from '@/components/waitlist/referral-codes';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { LAUNCH_DATE } from '@/lib/web/launch';
import { getLocationBySlug } from '@/lib/web/locations';
import { getTradeBySlug } from '@/lib/web/trades';
import { CHECKED_FIVE_WAYS } from '@/lib/web/verification-copy';

const TRUST = ['Verified', 'Licensed', 'Insured'];

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export default function WaitlistScreen() {
  const params = useLocalSearchParams<{ trade?: string; suburb?: string; src?: string; mate?: string }>();
  // Trade must be a real slug; suburb may be a path slug (prettify via the
  // majors list) or free text straight from a search box.
  const tradeParam = first(params.trade);
  const defaultTrade = getTradeBySlug(tradeParam) ? tradeParam : '';
  const suburbParam = first(params.suburb);
  const defaultSuburb = getLocationBySlug(suburbParam)?.name ?? suburbParam;
  // src=gate: the link carried a missed trade+suburb — the only path that
  // records the searched pair as a demand signal.
  const gated = first(params.src) === 'gate';
  const mateCode = normaliseMateCode(first(params.mate)) ?? '';
  const prize = LEGACY_PRIZE_AUD;

  const scrollRef = useRef<ScrollView>(null);
  const bodyY = useRef(0);
  const cardY = useRef(0);
  const beaconMeta = useMemo(() => ({ source: gated ? 'gated_redirect' : 'waitlist_page' }), [gated]);

  function scrollToCard() {
    scrollRef.current?.scrollTo({ y: Math.max(0, bodyY.current + cardY.current - Spacing.lg), animated: true });
  }

  return (
    <AppShell title="Waitlist" showBack background={WL.cream}>
      <FunnelBeacon event="waitlist_page_landed" meta={beaconMeta} path="/waitlist" />
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Hero: flat brand-green band ─────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.trustRow} accessibilityRole="list">
            {TRUST.map((t) => (
              <View key={t} style={styles.trustChip}>
                <HeroIcon d={CHECK_PATH} size={14} color={WL.heroChipText} strokeWidth={2.5} />
                <Text style={styles.trustChipText}>{t}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.fiveWays}>{CHECKED_FIVE_WAYS}</Text>
          <Text style={styles.h1} accessibilityRole="header">
            Be first when verified tradies go live in your suburb
          </Text>
          <Text style={styles.sub}>Free to join · no lead fees · no spam — launching {LAUNCH_DATE}</Text>
          <View style={styles.pillRow}>
            <View style={styles.drawPill}>
              <HeroIcon d={GIFT_PATH} size={14} color={WL.amberText} strokeWidth={1.8} />
              <Text style={styles.drawPillText}>
                {DRAW_LIVE
                  ? `Name the job you need done — ${DRAW_NAME} is at ${formatDrawPrize(prize)}`
                  : `One quick question after joining = your ${formatDrawPrize(prize)} draw entry`}
              </Text>
            </View>
          </View>
        </View>

        {/* Signup card + everything below it */}
        <View style={styles.body} onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
          <WaitlistFlow
            source={gated ? 'gated_redirect' : 'waitlist_page'}
            defaultTrade={defaultTrade}
            defaultSuburb={defaultSuburb}
            searchedTrade={gated ? defaultTrade || undefined : undefined}
            searchedSuburb={gated ? defaultSuburb || undefined : undefined}
            mateCode={mateCode}
            drawPrize={prize}
            onJoinPress={scrollToCard}
            onCardLayout={(e) => (cardY.current = e.nativeEvent.layout.y)}
          />
        </View>

        <Footer />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 0,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: WL.heroBand,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['5xl'],
    paddingBottom: Spacing['6xl'] + Spacing['3xl'],
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: WL.heroChip,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trustChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: WL.heroChipText,
  },
  fiveWays: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: WL.heroSub,
  },
  h1: {
    marginTop: Spacing.xl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
    color: WL.white,
  },
  sub: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: WL.heroSub,
  },
  pillRow: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  drawPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: WL.amber,
    paddingHorizontal: 16,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  drawPillText: {
    flexShrink: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 18,
    color: WL.amberText,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['6xl'],
  },
});
