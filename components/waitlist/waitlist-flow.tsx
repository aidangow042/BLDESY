/**
 * WaitlistFlow — port of ~/bldesy-web/components/waitlist/waitlist-flow.tsx:
 * the /waitlist page body below the hero. Owns the one bit of state the page
 * can't know: whether step 1 has landed. Pre-signup it shows the full pitch
 * (what happens next, benefits, repeat CTA); once the form confirms, those
 * join-led sections retire.
 *
 * Deep-link params (`?trade=&suburb=&src=gate&mate=`) are resolved by the
 * screen and passed in. Not ported: the `src=account-blocked` notice — that is
 * the website's waitlist-mode login bounce, which the LIVE app never produces.
 *
 * The social-proof count is a server read the app has no endpoint for, so the
 * bottom banner always shows the no-count copy (the web hides the count below
 * its threshold anyway).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { CHECK_PATH, HeroIcon } from '@/components/marketing/hero-icon';
import { FontFamily, Radius, Spacing } from '@/constants/theme';

import { DRAW_PILL_LABEL } from './draw-prize';
import { WL } from './palette';
import { WaitlistForm } from './waitlist-form';

const NEXT_STEPS = [
  { step: '1. You join', detail: '30 seconds, free' },
  { step: '2. We verify tradies in your suburb', detail: 'Checked five ways' },
  { step: '3. You see them first', detail: 'The day we go live' },
];

const BENEFITS = ['Every tradie checked five ways', 'Free — no lead fees', `First in line + ${DRAW_PILL_LABEL}`];

export interface WaitlistFlowProps {
  /** waitlist_page, or gated_redirect when the link carried ?src=gate. */
  source: 'waitlist_page' | 'gated_redirect';
  defaultTrade?: string;
  defaultSuburb?: string;
  /** Set only on the gated path — the demand signal for a missed trade+suburb. */
  searchedTrade?: string;
  searchedSuburb?: string;
  mateCode?: string;
  drawPrize?: number;
  /** The bottom banner's "Join the waitlist" scrolls back to the card. */
  onJoinPress?: () => void;
  /** Reports the signup card's y within the screen's ScrollView. */
  onCardLayout?: (e: LayoutChangeEvent) => void;
}

export function WaitlistFlow({
  source,
  defaultTrade = '',
  defaultSuburb = '',
  searchedTrade,
  searchedSuburb,
  mateCode = '',
  drawPrize,
  onJoinPress,
  onCardLayout,
}: WaitlistFlowProps) {
  const [joined, setJoined] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <View>
      {/* ── Signup card — overlaps the hero ─────────────────────────── */}
      <View style={styles.card} onLayout={onCardLayout}>
        <WaitlistForm
          source={source}
          defaultTrade={defaultTrade}
          defaultSuburb={defaultSuburb}
          searchedTrade={searchedTrade}
          searchedSuburb={searchedSuburb}
          defaultMateCode={mateCode}
          drawPrize={drawPrize}
          onJoined={() => setJoined(true)}
        />
      </View>

      {/* Why a waitlist — the reason to believe, tucked into a collapsible. Stays after signup too. */}
      <View style={styles.why}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: whyOpen }}
          onPress={() => setWhyOpen((o) => !o)}
          style={styles.whyRow}
        >
          <Text style={styles.whyTitle}>Why a waitlist?</Text>
          <Ionicons name={whyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={WL.muted} />
        </Pressable>
        {whyOpen ? (
          <Text style={styles.whyBody}>
            BLDESY only shows you tradies who are verified and actually cover your suburb — so we&apos;d rather line
            up the right ones than send you to an empty search.
          </Text>
        ) : null}
      </View>

      {joined ? null : (
        <>
          {/* ── What happens next ─────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              What happens next
            </Text>
            <View style={styles.steps}>
              {NEXT_STEPS.map((s) => (
                <View key={s.step} style={styles.stepCard}>
                  <Text style={styles.stepTitle}>{s.step}</Text>
                  <Text style={styles.stepDetail}>{s.detail}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Benefits — one compact pill row ───────────────────────── */}
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefit}>
                <HeroIcon d={CHECK_PATH} size={16} color={WL.green} strokeWidth={2.5} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {/* ── Bottom banner — repeat CTA (no fake numbers) ──────────── */}
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Join now and you see verified tradies first the day we go live in your suburb.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onJoinPress}
              style={({ pressed }) => [styles.bannerButton, pressed && { backgroundColor: WL.greenDark }]}
            >
              <Text style={styles.bannerButtonLabel}>Join the waitlist</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: -40,
    borderRadius: Radius.xl,
    backgroundColor: WL.white,
    padding: Spacing.xl,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  why: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: WL.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  whyTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: WL.ink,
  },
  whyBody: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: WL.muted,
  },
  section: {
    marginTop: Spacing['4xl'],
  },
  sectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 16,
    color: WL.ink,
  },
  steps: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  stepCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: WL.cardBorder,
    backgroundColor: WL.white,
    padding: Spacing.lg,
  },
  stepTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: WL.ink,
  },
  stepDetail: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: WL.muted2,
  },
  benefits: {
    marginTop: Spacing['2xl'],
    gap: Spacing.sm,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: WL.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  benefitText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
    color: WL.chipText,
  },
  banner: {
    marginTop: Spacing['4xl'],
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: WL.mintBorder,
    backgroundColor: WL.mint,
    padding: Spacing.xl,
  },
  bannerText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: WL.deepGreen,
  },
  bannerButton: {
    borderRadius: Radius.full,
    backgroundColor: WL.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  bannerButtonLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: WL.white,
  },
});
