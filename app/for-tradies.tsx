/**
 * /for-tradies — port of ~/bldesy-web/app/for-tradies/page.tsx, section for
 * section: gradient hero, stats bar, callback form, the three wounds, the ROI
 * calculator, how it works (+ SMS link), the profile shopfront + five checks,
 * capped supply + founding offer, the tier ladder, FAQ, final CTA.
 *
 * Every join CTA hands off to the website wizard (lib/web-onboarding) and
 * fires `tradie_signup_cta_tapped` first, exactly as the web page does.
 *
 * iOS sells nothing (lib/iap-policy CAN_SELL_IN_APP): the tier ladder drops its
 * prices and the "Annual billing saves…" line, and the ROI calculator — a
 * price comparison against our Trade plan — is hidden. Android sees the web.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppShell } from '@/components/layout';
import { Footer } from '@/components/layout/footer';
import {
  CHECK_PATH,
  FAQItem,
  FunnelBeacon,
  GradientHero,
  HeroIcon,
  PingDot,
  RangeSlider,
  type FAQ,
} from '@/components/marketing';
import { FoundingSpotsLeft, SpotsRemaining } from '@/components/supply';
import { CallbackForm } from '@/components/tradie/callback-form';
import { SmsLinkForm } from '@/components/tradie/sms-link-form';
import { Button, CountUp } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { TRADIE_TIERS } from '@/lib/web/pricing-tiers-client';
import { COVERAGE } from '@/lib/web/service-areas';
import { FIVE_CHECKS } from '@/lib/web/verification-copy';

const GREEN_300 = '#86efac';
const EMERALD_500 = '#10b981';
const YELLOW_500 = '#eab308';

/* ── Data ──────────────────────────────────────────────────────── */

const STATS = [
  { value: 50, suffix: '+', label: 'Trade categories' },
  { value: parseInt(COVERAGE.suburbs, 10), suffix: '+', label: 'Inner-Sydney suburbs at launch' },
  { value: 0, suffix: '', label: 'Per-lead fees', display: '$0' },
  { value: 100, suffix: '%', label: 'Australian-owned' },
];

// The three doors' wounds — older solo on referrals, new solo with no
// reviews, small outfit paying per lead. One card each.
const PAIN_POINTS = [
  {
    title: 'Referrals are ageing out',
    description:
      'Referrals still work — but the people who swear by you are a generation older than the people buying the houses now.',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'No reviews, no look-in',
    description: "New ABN, no reviews yet? You're getting filtered out before anyone's even seen the work.",
    icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  },
  {
    title: 'Renting leads, keeping nothing',
    description:
      'Paying $30–$80 a lead to quote against five other tradies — money that never stacks into anything you keep.',
    icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  },
];

const STEPS = [
  {
    number: '1',
    title: 'Verify',
    description: 'Sign up, pick your trade, ABN + licence checked. Under five minutes.',
  },
  {
    number: '2',
    title: 'Put your work up',
    description: 'Your best photos, prices, specialties, service area. This is the bit that does the selling.',
  },
  {
    number: '3',
    title: 'Get seen. Get chosen.',
    description:
      'Homeowners who contact you have already seen your work and your price. Warmer calls, no quote-offs.',
  },
];

// The old five-row comparison table, compressed to its three sharpest
// contrasts — rendered as chips under the calculator output.
const COMPARE_CHIPS = [
  { others: '$30–$80 per lead', bldesy: 'from $19/mo flat' },
  { others: 'Lead shared with 4–6 tradies', bldesy: 'the enquiry is yours alone' },
  { others: 'Up to 10% commission', bldesy: '$0 — keep every dollar' },
];

const FAQ_ITEMS: FAQ[] = [
  {
    question: 'What does it cost, and when do I start paying?',
    answer:
      'Signing up and creating your profile is completely free, and plans start at $19/month — no per-lead fees, no commissions, ever. Annual billing saves up to 28%. Your card is never charged until 3 homeowners have contacted you through the platform — then a 14-day grace period runs before your first bill, with a reminder before anything is charged. Founding tradies (the first 200) lock in launch rates forever.',
  },
  {
    question: "What's the Founding Tradie programme?",
    answer:
      "Everyone who joins during our launch period (the first 200 tradies) keeps a permanent Founding Tradie badge and locks in today's launch rates forever. No catch, no expiry, no fine print — and like every tradie on BLDESY, you don't pay a cent until we've brought you 3 homeowner enquiries.",
  },
  {
    question: 'What trades can join — and do I need a licence?',
    answer:
      "We support 50+ trade categories — from builders, plumbers and electricians to specialists like arborists and civil contractors — with spots per trade capped in each area. Everyone needs a valid ABN. For licensed trades we verify your licence number live against NSW Fair Trading. For trades that don't carry a licence — like handyman or gardening — we still verify your ABN, photo ID and insurance; licence and White Card just don't apply.",
  },
  {
    question: 'How do jobs reach me?',
    answer:
      'As homeowners in your area post jobs, the ones that fit your trade and service area reach you by email and push notification. You see the full job before you apply — no obligation.',
  },
  {
    question: 'Can I choose which jobs I apply for?',
    answer:
      "Always. You see full job details before applying — location, scope, budget, timeline, the client's previous-job history. You only apply to jobs you actually want. No obligation, no pressure, no penalty for being selective.",
  },
  {
    question: 'What areas does BLDESY cover?',
    answer: `We're launching inner Sydney first — ${COVERAGE.line} — and expanding area by area from there. Work outside our founding neighbourhoods? Apply anyway: you'll reserve your spot for your area and we'll tell you the moment it opens.`,
  },
];

/* ── Main screen ──────────────────────────────────────────────── */

export default function ForTradiesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);
  const howItWorksY = useRef(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Every join CTA on this page opens the wizard; the funnel step fires on the tap itself.
  const join = useCallback(() => {
    trackFunnelEvent('tradie_signup_cta_tapped', { via: 'for_tradies' });
    void openWebOnboarding('builder');
  }, []);

  function scrollToHowItWorks() {
    scrollRef.current?.scrollTo({ y: howItWorksY.current, animated: true });
  }

  return (
    <AppShell title="For tradies" showBack>
      <FunnelBeacon event="for_tradies_landed" path="/for-tradies" />
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── 1. Hero ──────────────────────────────────────────────── */}
        <GradientHero>
          <View style={styles.center}>
            <View style={styles.foundingPill}>
              <PingDot color={GREEN_300} />
              <Text style={styles.foundingPillText}>Founding Tradie — first 200 lock launch rates forever</Text>
              <FoundingSpotsLeft style={styles.foundingCounter} textStyle={styles.foundingCounterText} />
            </View>

            <Text style={styles.h1} accessibilityRole="header">
              Get chosen for your work,
            </Text>
            <View style={[styles.h1Underline, { borderBottomColor: c.cta }]}>
              <Text style={styles.h1}>not your price.</Text>
            </View>

            <Text style={styles.lede}>
              BLDESY puts your work on the record — photos, prices, specialties — checked five ways: ABN, licence,
              photo ID, White Card, insurance.
              <Text style={styles.ledeStrong}> When a homeowner reaches you, they&apos;ve already picked you.</Text>
            </Text>

            <View style={styles.heroCtas}>
              <WhiteButton label="Claim your founding spot — free" onPress={join} color={c.primary} />
              <Pressable accessibilityRole="button" onPress={scrollToHowItWorks} style={styles.outlineButton}>
                <Text style={styles.outlineButtonLabel}>See How It Works</Text>
              </Pressable>
            </View>

            <Text style={styles.heroNote}>
              Nothing to pay until 3 homeowners contact you. Launch rates locked forever.
            </Text>

            <View style={styles.heroTicks}>
              {['Free to sign up', 'Checked five ways', 'Cancel anytime'].map((t) => (
                <View key={t} style={styles.heroTick}>
                  <HeroIcon d={CHECK_PATH} size={16} color={GREEN_300} strokeWidth={2} />
                  <Text style={styles.heroTickText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </GradientHero>

        {/* ── 2. Stats bar ─────────────────────────────────────────── */}
        <View style={[styles.statsBar, { backgroundColor: c.surface, borderColor: c.border }]}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              {stat.display ? (
                <Text style={[styles.statValue, { color: c.primary }]}>{stat.display}</Text>
              ) : (
                <CountUp
                  value={stat.value}
                  format={(n) => `${Math.round(n).toLocaleString('en-AU')}${stat.suffix}`}
                  style={[styles.statValue, { color: c.primary }]}
                />
              )}
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── 2.5 The callback form — the paid-channel conversion ──── */}
        <View style={styles.section}>
          <View style={[styles.callbackCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.primary + '40' }]}>
            <Eyebrow>Rather talk than type?</Eyebrow>
            <Text style={[styles.h2, { color: c.textPrimary }]} accessibilityRole="header">
              Flick us your number — we&apos;ll bell you today.
            </Text>
            <Text style={[styles.bodySm, { color: c.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.xl }]}>
              One call to set up your founding profile: your work, your prices, verified five ways. Chosen, not matched
              — and never pay per lead.
            </Text>
            <CallbackForm />
          </View>
        </View>

        {/* ── 3. The three wounds ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.center}>
            <Eyebrow>Sound familiar?</Eyebrow>
            <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
              Three ways good tradies get skipped
            </Text>
          </View>
          <View style={styles.cards}>
            {PAIN_POINTS.map((point) => (
              <View key={point.title} style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.painIcon, { backgroundColor: c.primary + '1A' }]}>
                  <HeroIcon d={point.icon} size={28} color={c.primary} />
                </View>
                <Text style={[styles.h3, { color: c.textPrimary }]}>{point.title}</Text>
                <Text style={[styles.bodySm, { color: c.textSecondary, marginTop: Spacing.sm }]}>{point.description}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.body, styles.textCenter, { color: c.textSecondary, marginTop: Spacing['4xl'] }]}>
            <Text style={[styles.strong, { color: c.textPrimary }]}>Same cause every time:</Text> they can&apos;t see
            or believe your work before you talk. Fix what they see, and price stops being the conversation.
          </Text>
        </View>

        {/* ── 4. Interactive ROI calculator (a price comparison — not on iOS) ── */}
        {CAN_SELL_IN_APP ? <RoiCalculator onJoin={join} /> : null}

        {/* ── 5. How it works ──────────────────────────────────────── */}
        <View
          style={[styles.section, { backgroundColor: c.surface }]}
          onLayout={(e) => (howItWorksY.current = e.nativeEvent.layout.y)}
        >
          <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
            Five minutes. Done once.
          </Text>
          <View style={styles.steps}>
            {STEPS.map((step) => (
              <View key={step.number} style={styles.step}>
                <View style={[styles.stepNumber, Shadows.md, { backgroundColor: c.primary }]}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                <Text style={[styles.h3, styles.textCenter, { color: c.textPrimary }]}>{step.title}</Text>
                <Text style={[styles.bodySm, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.sm }]}>
                  {step.description}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.center}>
            <Button size="lg" onPress={join} style={styles.wideButton} fullWidth>
              Join as a Tradie →
            </Button>
          </View>

          {/* Smaller yes — SMS the application link for later. */}
          <View style={[styles.smsCard, { backgroundColor: c.canvas, borderColor: c.border }]}>
            <Text style={[styles.smsTitle, { color: c.textPrimary }]}>Not near your paperwork?</Text>
            <Text style={[styles.bodySm, { color: c.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.md }]}>
              First name and mobile — we&apos;ll text you the link for when you&apos;ve got your ABN handy.
            </Text>
            <SmsLinkForm source="for_tradies" />
          </View>
        </View>

        {/* ── 6. Profile — the shopfront + the five checks ─────────── */}
        <View style={styles.section}>
          <Eyebrow>Verified five ways</Eyebrow>
          <Text style={[styles.h2, { color: c.textPrimary }]} accessibilityRole="header">
            Your profile does the selling <Text style={{ color: c.primary }}>for you.</Text>
          </Text>
          <Text style={[styles.body, { color: c.textSecondary, marginTop: Spacing.md }]}>
            A verified shopfront, built once in five minutes. No website needed.
          </Text>
          <Text style={[styles.body, { color: c.textSecondary, marginTop: Spacing.md }]}>
            Photos of your real work lead — homeowners pick the tradie whose finished jobs they can see. Then the
            checks make them believe it:
          </Text>
          <Text style={[styles.bodySm, { color: c.textSecondary, marginTop: Spacing.md }]}>
            Homeowners and builders trust you on sight because the badges are checked against official registers —
            and insurance certificates are verified directly. Not self-declared.
          </Text>

          <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border, marginTop: Spacing['2xl'], gap: Spacing.lg }]}>
            {FIVE_CHECKS.map((check) => (
              <View key={check.name} style={styles.checkRow}>
                <HeroIcon d={CHECK_PATH} size={20} color={c.success} strokeWidth={2} style={{ marginTop: 2 }} />
                <Text style={[styles.bodySm, { color: c.textPrimary, flex: 1 }]}>
                  <Text style={styles.strong}>{check.name}</Text>
                  {' — '}
                  {check.detail}
                </Text>
              </View>
            ))}
            <Text style={[styles.smsTitle, { color: c.textPrimary }]}>Done once. It sits there working.</Text>
          </View>

          <ProfileMockCard />
        </View>

        {/* ── 7. Capped on purpose + founding offer ─────────────────── */}
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
            Capped on purpose.
          </Text>
          <Text style={[styles.body, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.lg }]}>
            When your trade is full in your area, it&apos;s full. That&apos;s the point — every member competes with
            a handful of locals, not hundreds, and homeowners always see tradies who can actually take the job. Check
            your trade before someone else takes your area.
          </Text>
          <View style={{ marginTop: Spacing['3xl'] }}>
            <SpotsRemaining />
          </View>

          <Text style={[styles.h3Lg, styles.textCenter, { color: c.textPrimary, marginTop: Spacing['6xl'] - Spacing.sm }]} accessibilityRole="header">
            We don&apos;t fake testimonials.
          </Text>
          <Text style={[styles.body, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.lg }]}>
            BLDESY hasn&apos;t launched yet, so we&apos;re not going to invent quotes from tradies who don&apos;t
            exist. Instead: be one of the first 200 Australian tradies on the platform, pay{' '}
            <Text style={[styles.strong, { color: c.textPrimary }]}>nothing until 3 homeowners contact you</Text>,
            lock in launch rates forever, and get a permanent Founding Tradie badge that signals to homeowners you
            backed this thing early.
          </Text>
          <Text style={[styles.bodySm, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.md }]}>
            Your founding rate never goes up. No catch.
          </Text>
          <View style={[styles.center, { marginTop: Spacing['3xl'] }]}>
            <Button size="lg" onPress={join} fullWidth>
              Claim Your Spot →
            </Button>
          </View>
        </View>

        {/* ── 8. Tier ladder snapshot ──────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.center}>
            <Eyebrow>Pick your fit</Eyebrow>
            <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
              Four tiers. Pick the one that fits your work.
            </Text>
            {CAN_SELL_IN_APP ? (
              <Text style={[styles.body, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.md }]}>
                Annual billing saves up to 28%.
              </Text>
            ) : null}
          </View>
          <View style={styles.tiers}>
            {TRADIE_TIERS.map((tier) => {
              const featured = tier.badge === 'most_popular';
              return (
                <View
                  key={tier.key}
                  style={[
                    styles.tierCard,
                    Shadows.sm,
                    { backgroundColor: c.surface, borderColor: featured ? c.primary : c.border, borderWidth: featured ? 2 : 1 },
                  ]}
                >
                  {tier.badge ? (
                    <View style={styles.tierBadgeWrap}>
                      <View style={[styles.tierBadge, { backgroundColor: c.primary }]}>
                        <Text style={styles.tierBadgeText}>
                          {tier.badge === 'most_popular' ? 'Most popular' : 'Best value'}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <Text style={[styles.tierName, { color: c.textPrimary }]}>{tier.name}</Text>
                  {CAN_SELL_IN_APP ? (
                    <>
                      <View style={styles.tierPriceRow}>
                        <Text style={[styles.tierPrice, { color: c.textPrimary }]}>${tier.monthly}</Text>
                        <Text style={[styles.tierPer, { color: c.textSecondary }]}>/month</Text>
                      </View>
                      <Text style={[styles.tierAnnual, { color: c.textSecondary }]}>
                        or ${tier.annual.toLocaleString('en-AU')}/yr
                      </Text>
                    </>
                  ) : null}
                  <Text style={[styles.tierBestFor, { color: c.textSecondary }]}>{tier.bestFor}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── 9. FAQ ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
            Questions? We&apos;ve got answers.
          </Text>
          <View style={styles.faqs}>
            {FAQ_ITEMS.map((faq, i) => (
              <FAQItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </View>
        </View>

        {/* ── 10. Final CTA ────────────────────────────────────────── */}
        <LinearGradient colors={[c.primary, c.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.finalCta}>
          <Text style={styles.finalEyebrow}>Spots capped per trade, per area</Text>
          <Text style={styles.finalTitle} accessibilityRole="header">
            Stop paying per lead. Start getting chosen.
          </Text>
          <Text style={styles.finalBody}>
            First 200 tradies · free until 3 homeowners contact you · rates locked forever
          </Text>
          <View style={{ marginTop: Spacing['3xl'] }}>
            <WhiteButton label="Join as a Tradie →" onPress={join} color={c.primary} />
          </View>
          <Text style={styles.finalNote}>Free to sign up • No per-lead fees • No commissions • Cancel anytime</Text>
        </LinearGradient>

        <Footer />
      </ScrollView>
    </AppShell>
  );
}

/* ── Interactive ROI calculator ───────────────────────────────── */

function RoiCalculator({ onJoin }: { onJoin: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const dark = scheme === 'dark';
  // Defaults sized to a "real" tradie's worst-case lead-gen spend:
  // 5 leads/week × $50 each. Slider runs $0 → $1000/mo.
  const [monthlyLeadSpend, setMonthlyLeadSpend] = useState(400);
  // Anchored to the Trade tier ($39/mo) as the most common BLDESY plan.
  const tradePlanCost = 39;
  const monthlySavings = Math.max(0, monthlyLeadSpend - tradePlanCost);
  const annualSavings = monthlySavings * 12;
  const estLeadsPerMonth = useMemo(() => Math.round(monthlyLeadSpend / 50), [monthlyLeadSpend]);

  const rose = dark
    ? { bg: 'rgba(76, 5, 25, 0.2)', border: 'rgba(136, 19, 55, 0.5)', label: '#fda4af', value: '#ffe4e6' }
    : { bg: '#fff1f2', border: '#fecdd3', label: '#be123c', value: '#881337' };

  return (
    <View style={styles.section}>
      <View style={[styles.center, { marginBottom: Spacing['4xl'] }]}>
        <Eyebrow>See your savings</Eyebrow>
        <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
          Stop paying per lead.
        </Text>
        <Text style={[styles.body, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.md }]}>
          Paying for leads right now? Drag it to your monthly spend and see what you&apos;d keep.
        </Text>
      </View>

      <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border, padding: Spacing['2xl'] }]}>
        {/* Current lead spend slider */}
        <View style={styles.sliderHeader}>
          <Text style={[styles.sliderLabel, { color: c.textPrimary }]}>Your current lead spend</Text>
          <Text style={[styles.sliderValue, { color: c.textPrimary }]}>
            ${monthlyLeadSpend.toLocaleString('en-AU')}
            <Text style={[styles.sliderValueUnit, { color: c.textSecondary }]}>/mo</Text>
          </Text>
        </View>
        <RangeSlider
          value={monthlyLeadSpend}
          min={0}
          max={1000}
          step={25}
          onChange={setMonthlyLeadSpend}
          accessibilityLabel="Your current lead spend per month"
          trackColor={c.border}
          fillColor={c.primary}
          thumbColor={c.surface}
        />
        <View style={styles.sliderTicks}>
          {['$0', '$500', '$1,000'].map((t) => (
            <Text key={t} style={[styles.sliderTick, { color: c.textSecondary }]}>
              {t}
            </Text>
          ))}
        </View>
        <Text style={[styles.roiNote, { color: c.textSecondary }]}>
          Roughly <Text style={styles.strong}>{estLeadsPerMonth}</Text> shared leads/month at $50 each — and
          you&apos;re competing with 4–6 other tradies for every one.
        </Text>

        {/* Comparison cards */}
        <View style={styles.compareRow}>
          <View style={[styles.compareCard, { backgroundColor: rose.bg, borderColor: rose.border }]}>
            <Text style={[styles.compareLabel, { color: rose.label }]}>Lead-gen platforms</Text>
            <Text style={[styles.compareValue, { color: rose.value }]}>
              ${monthlyLeadSpend.toLocaleString('en-AU')}
              <Text style={styles.compareUnit}>/mo</Text>
            </Text>
          </View>
          <View style={[styles.compareCard, { backgroundColor: c.success + '1A', borderColor: c.success + '4D' }]}>
            <Text style={[styles.compareLabel, { color: c.success }]}>BLDESY Trade plan</Text>
            <Text style={[styles.compareValue, { color: c.success }]}>
              ${tradePlanCost}
              <Text style={styles.compareUnit}>/mo</Text>
            </Text>
          </View>
        </View>

        {/* Savings result */}
        <LinearGradient colors={[c.primary, EMERALD_500]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.savings}>
          <Text style={styles.savingsLabel}>You&apos;d keep</Text>
          <Text style={styles.savingsValue}>
            ${annualSavings.toLocaleString('en-AU')}
            <Text style={styles.savingsUnit}>/year</Text>
          </Text>
          <Text style={styles.savingsNote}>
            {monthlySavings > 0
              ? `That's $${monthlySavings.toLocaleString('en-AU')}/month back in your pocket.`
              : 'Currently spending less than $39 — try Handyman tier at $19.'}
          </Text>
        </LinearGradient>

        {/* The comparison table's three sharpest rows, kept as chips. */}
        <View style={styles.chips}>
          {COMPARE_CHIPS.map((chip) => (
            <View key={chip.others} style={[styles.chip, { borderColor: c.border, backgroundColor: c.canvas }]}>
              <Text style={[styles.chipText, { color: c.textSecondary }]}>
                {chip.others} → <Text style={[styles.chipStrong, { color: c.primary }]}>{chip.bldesy}</Text>
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.center, { marginTop: Spacing['2xl'] }]}>
          <Button size="lg" onPress={onJoin} fullWidth>
            Start Saving — Join Free
          </Button>
          <Text style={[styles.tierAnnual, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.md }]}>
            Founding period: first 200 tradies lock launch rates forever — and nobody pays until 3 homeowners reach
            out.
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ── Visual: example builder profile card (mock data, labelled) ── */

function ProfileMockCard() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const badges = ['ABN', 'NSW Licence', 'Photo ID', 'White Card', 'Insurance'];
  return (
    <View style={[styles.mock, Shadows.xl, { backgroundColor: c.canvas, borderColor: c.border }]} accessibilityLabel="Example profile">
      <View style={styles.mockExample}>
        <Text style={styles.mockExampleText}>Example profile</Text>
      </View>
      <LinearGradient colors={[c.primary + '4D', c.primary + '26', EMERALD_500 + '33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mockCover} />
      <View style={styles.mockBody}>
        <View style={styles.mockHead}>
          <LinearGradient colors={[c.primary, EMERALD_500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.mockAvatar, { borderColor: c.canvas }]}>
            <Text style={styles.mockAvatarText}>PE</Text>
          </LinearGradient>
          <View style={styles.mockStars}>
            <Text style={{ color: YELLOW_500, fontSize: 14 }}>★★★★★</Text>
            <Text style={[styles.mockMeta, { color: c.textSecondary }]}>4.9 (28 reviews)</Text>
          </View>
        </View>
        <Text style={[styles.mockName, { color: c.textPrimary }]}>Pacific Electrical Services</Text>
        <Text style={[styles.bodySm, { color: c.textSecondary }]}>Electrician · Inner West, Sydney</Text>
        <View style={styles.mockBadges}>
          {badges.map((b) => (
            <View key={b} style={[styles.mockBadge, { backgroundColor: c.success + '26' }]}>
              <HeroIcon d={CHECK_PATH} size={12} color={c.success} strokeWidth={2} />
              <Text style={[styles.mockBadgeText, { color: c.success }]}>{b}</Text>
            </View>
          ))}
          <View style={[styles.mockBadge, { backgroundColor: c.primary + '26' }]}>
            <Text style={[styles.mockBadgeText, { color: c.primary }]}>★ Founding Tradie</Text>
          </View>
        </View>
        <Text style={[styles.bodySm, { color: c.textPrimary, marginTop: Spacing.lg }]}>
          Licensed sparky doing residential rewires, switchboard upgrades, and EV charger installs across the Inner
          West for 12 years.
        </Text>
        <View style={styles.mockStats}>
          {[
            ['28', 'Reviews'],
            ['12y', 'Experience'],
            ['15km', 'Service area'],
          ].map(([value, label]) => (
            <View key={label} style={[styles.mockStat, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.mockStatValue, { color: c.textPrimary }]}>{value}</Text>
              <Text style={[styles.mockStatLabel, { color: c.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.mockActions} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.mockAction, { backgroundColor: c.primary }]}>
            <Text style={[styles.mockActionText, { color: '#ffffff' }]}>Request a quote</Text>
          </View>
          <View style={[styles.mockAction, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
            <Text style={[styles.mockActionText, { color: c.textPrimary }]}>Message</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ── Small bits ──────────────────────────────────────────────── */

function Eyebrow({ children }: { children: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return <Text style={[styles.eyebrow, { color: c.primary }]}>{children}</Text>;
}

function WhiteButton({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.whiteButton, Shadows.xl, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
    >
      <Text style={[styles.whiteButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 0,
  },
  center: {
    alignItems: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  h1: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
    textAlign: 'center',
    color: '#ffffff',
  },
  h1Underline: {
    borderBottomWidth: 4,
    paddingBottom: 6,
  },
  h2: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 30,
  },
  h3: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  h3Lg: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 26,
  },
  bodySm: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  strong: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  foundingPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: Spacing['2xl'],
  },
  foundingPillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#ffffff',
  },
  foundingCounter: {
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  foundingCounterText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 11,
    color: '#ffffff',
  },
  lede: {
    marginTop: Spacing.xl,
    maxWidth: 560,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    color: '#ffffff',
  },
  ledeStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  heroCtas: {
    marginTop: Spacing['3xl'],
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  whiteButton: {
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['4xl'],
  },
  whiteButtonLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
  },
  outlineButton: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  outlineButtonLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
  heroNote: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
  },
  heroTicks: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing.xl,
    rowGap: Spacing.sm,
  },
  heroTick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTickText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['4xl'],
    rowGap: Spacing['3xl'],
  },
  stat: {
    width: '50%',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  statValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 36,
  },
  statLabel: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  callbackCard: {
    borderRadius: Radius['2xl'],
    borderWidth: 2,
    padding: Spacing['2xl'],
  },
  cards: {
    marginTop: Spacing['5xl'],
    gap: Spacing['2xl'],
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
  },
  painIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  steps: {
    marginTop: Spacing['5xl'],
    gap: Spacing['4xl'],
  },
  step: {
    alignItems: 'center',
  },
  stepNumber: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  stepNumberText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 20,
    color: '#ffffff',
  },
  wideButton: {
    marginTop: Spacing['4xl'],
  },
  smsCard: {
    marginTop: Spacing['5xl'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  smsTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  tiers: {
    marginTop: Spacing['4xl'],
    gap: Spacing.lg,
  },
  tierCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.md,
    overflow: 'visible',
  },
  tierBadgeWrap: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tierBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tierBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  tierName: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 28,
  },
  tierPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: Spacing.md,
  },
  tierPrice: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 30,
    lineHeight: 36,
  },
  tierPer: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  tierAnnual: {
    marginTop: 2,
    fontFamily: FontFamily.body,
    fontSize: 11,
    lineHeight: 16,
  },
  tierBestFor: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 17,
  },
  faqs: {
    marginTop: Spacing['4xl'],
    gap: Spacing.md,
  },
  finalCta: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  finalEyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.md,
  },
  finalTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    color: '#ffffff',
  },
  finalBody: {
    marginTop: Spacing.md,
    maxWidth: 480,
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
  },
  finalNote: {
    marginTop: Spacing['2xl'],
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
  },

  /* ROI */
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sliderLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  sliderValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 24,
  },
  sliderValueUnit: {
    fontFamily: FontFamily.body,
    fontWeight: '400',
    fontSize: 14,
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderTick: {
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  roiNote: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
  },
  compareRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing['3xl'],
    marginBottom: Spacing['2xl'],
  },
  compareCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  compareLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  compareValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 24,
  },
  compareUnit: {
    fontFamily: FontFamily.body,
    fontWeight: '400',
    fontSize: 14,
  },
  savings: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  savingsLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  savingsValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 30,
    lineHeight: 36,
    color: '#ffffff',
  },
  savingsUnit: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  savingsNote: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
  },
  chips: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  chipStrong: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },

  /* Profile mock */
  mock: {
    marginTop: Spacing['4xl'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mockExample: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mockExampleText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  mockCover: {
    height: 128,
  },
  mockBody: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    marginTop: -40,
  },
  mockHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.lg,
  },
  mockAvatar: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockAvatarText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 20,
    color: '#ffffff',
  },
  mockStars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  mockMeta: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  mockName: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 26,
  },
  mockBadges: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mockBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
  },
  mockStats: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mockStat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  mockStatValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 16,
  },
  mockStatLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mockActions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mockAction: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mockActionText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
});
