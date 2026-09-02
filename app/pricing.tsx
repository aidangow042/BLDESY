/**
 * /pricing — port of ~/bldesy-web/app/pricing/pricing-page-client.tsx
 * (tradie-only side).
 *
 * iOS sells nothing (lib/iap-policy CAN_SELL_IN_APP): the homeowner strip,
 * the founding programme, the why-cards and the FAQ prose render everywhere,
 * but the billing toggle, the tier cards with their prices and per-tier
 * "Start with this tier" CTAs, and the compare-against price callouts are
 * Android-only. On Android the per-tier CTA is the tradie join hand-off
 * (lib/web-onboarding) — the app never opens a purchase page.
 *
 * Not ported: the "You're subscribed" banner (reads /api/me/subscription-summary,
 * which the app has no client for — billing state lives on the portal
 * billing screen). The gradient text on the h1 renders in plain primary.
 */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { AppShell } from '@/components/layout';
import { Footer } from '@/components/layout/footer';
import {
  ARROW_RIGHT_PATH,
  BOLT_SOLID_PATH,
  FAQItem,
  HeroIcon,
  PingDot,
  SHIELD_SOLID_PATH,
  STAR_SOLID_PATH,
  TICK_SOLID_PATH,
  type FAQ,
} from '@/components/marketing';
import { Button } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { ROUTES } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';
import {
  TRADIE_TIERS,
  annualSavings,
  annualSavingsPercent,
  type BillingInterval,
  type TradieTier,
} from '@/lib/web/pricing-tiers-client';
import { FIVE_CHECKS_LIST } from '@/lib/web/verification-copy';

const EMERALD_500 = '#10b981';
const INDIGO_500 = '#6366f1';
const AMBER_500 = '#f59e0b';
const ROSE_400 = '#fb7185';
const AMBER_400 = '#fbbf24';
const INDIGO_400 = '#818cf8';
const ROSE_300 = '#fda4af';

const DOLLAR_SOLID_PATHS = [
  'M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.165.55.107.16.231.295.165.295z',
  'M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v.546a4.5 4.5 0 00-1.116.366c-.39.18-.748.422-1.046.732C6.78 8.875 6.5 9.557 6.5 10.314c0 .754.273 1.418.755 1.918.473.487 1.107.81 1.755 1.011V15.5c-.348-.067-.66-.169-.916-.299A2.2 2.2 0 017.36 14.5a.75.75 0 10-1.22.872c.296.414.673.74 1.121.971.418.215.882.354 1.39.422V17.25a.75.75 0 001.5 0v-.483a4.5 4.5 0 001.116-.366c.39-.18.748-.422 1.046-.732.51-.486.79-1.168.79-1.925 0-.755-.272-1.418-.755-1.918a4.07 4.07 0 00-1.755-1.011V6.825c.348.067.66.169.916.299.27.13.49.293.66.503a.75.75 0 101.22-.872 2.84 2.84 0 00-1.121-.971 4.5 4.5 0 00-1.39-.422V6.75z',
] as const;

const FAQS: FAQ[] = [
  {
    question: 'Is BLDESY really free for homeowners?',
    answer:
      'Completely. Searching, comparing profiles and messaging tradies costs nothing — and we never add booking fees or commissions on top of your job. Tradie subscriptions are how BLDESY makes money.',
  },
  {
    question: 'Do tradies get charged per lead?',
    answer:
      'Never. BLDESY is flat-fee. You pay one monthly (or annual) subscription and take as many enquiries as you want — no $30–$80 hit every time you quote, and no lead sold to 4 other tradies at the same time.',
  },
  {
    question: 'When do I actually start paying?',
    answer:
      'Only after BLDESY has delivered: your card is never charged until 3 homeowners have contacted you through the platform. Then a 14-day grace period runs before your first bill — and we message you before anything is charged. Cancel during grace and you pay nothing.',
  },
  {
    question: "What's the Founding Tradie programme?",
    answer:
      "The first 200 tradies to join keep a permanent Founding Tradie badge and lock in today's launch rates forever — your price never goes up. And like every tradie on BLDESY, you don't pay a cent until 3 homeowners have contacted you.",
  },
  {
    question: 'Can I switch tiers?',
    answer: 'Yes. Upgrade or downgrade at any time. Annual subscriptions pro-rate when you change.',
  },
  {
    question: 'What does annual billing save me?',
    answer:
      "Two months free on every tier — pay 10 months' worth upfront instead of 12. Trade is $390/yr instead of $468 billed monthly, for example.",
  },
  {
    question: 'Where is BLDESY available?',
    answer:
      "We're launching across inner Sydney first — concentrating verified tradies and homeowner demand in one market rather than spreading thin nationally. Tradies elsewhere in Australia can still join and appear in search as we expand.",
  },
];

export default function PricingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Tradie join hand-off — the wizard on the website, never a purchase page.
  const join = useCallback(() => {
    trackFunnelEvent('tradie_signup_cta_tapped', { via: 'pricing' });
    void openWebOnboarding('builder');
  }, []);

  return (
    <AppShell title="Pricing" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[c.primary + '1A', c.primary + '0D', 'transparent']}
            style={styles.heroGlow}
            pointerEvents="none"
          />
          <View style={styles.hero}>
            <View style={[styles.pricingPill, Shadows.sm, { borderColor: c.primary + '4D', backgroundColor: c.surface + 'CC' }]}>
              <PingDot color={c.primary} size={6} />
              <Text style={[styles.pricingPillText, { color: c.primary }]}>Pricing</Text>
            </View>
            <Text style={[styles.h1, { color: c.textPrimary }]} accessibilityRole="header">
              Free for homeowners.{'\n'}
              <Text style={{ color: c.primary }}>Flat and fair for tradies.</Text>
            </Text>
            <Text style={[styles.lede, { color: c.textSecondary }]}>
              Homeowners never pay to find, compare or message inner Sydney&apos;s verified tradies. Tradies pay one
              flat subscription —{' '}
              <Text style={[styles.strong, { color: c.textPrimary }]}>
                no per-lead fees, and nothing at all until we&apos;ve brought you work.
              </Text>
            </Text>

            {/* Trust chips — the integrations that back the verified shield. */}
            <View style={styles.trustChips}>
              <TrustChip icon="shield">ABR-checked ABNs</TrustChip>
              <TrustChip icon="shield">Verified by NSW Fair Trading</TrustChip>
              <TrustChip icon="shield">Photo ID matched</TrustChip>
              <TrustChip icon="shield">White Card checked</TrustChip>
              <TrustChip icon="bolt">AI-verified insurance</TrustChip>
            </View>
          </View>
        </View>

        {/* ── Homeowner strip — the free side, stated plainly ───────── */}
        <View style={styles.section}>
          <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.eyebrow, { color: c.primary }]}>For homeowners — always free</Text>
            <View style={styles.tickList}>
              {[
                'Search verified inner Sydney tradies',
                'Compare profiles, portfolios and reviews',
                'Message directly — no booking fees, no commissions',
              ].map((line) => (
                <View key={line} style={styles.tickRow}>
                  <Tick color={c.primary} />
                  <Text style={[styles.bodySm, { color: c.textSecondary, flex: 1 }]}>{line}</Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(ROUTES.search as Href)}
              style={({ pressed }) => [
                styles.outlinePill,
                { borderColor: c.primary, backgroundColor: pressed ? c.primary : 'transparent' },
              ]}
            >
              {({ pressed }) => (
                <>
                  <Text style={[styles.outlinePillLabel, { color: pressed ? '#ffffff' : c.primary }]}>Find a tradie</Text>
                  <HeroIcon d={ARROW_RIGHT_PATH} size={16} color={pressed ? '#ffffff' : c.primary} strokeWidth={2} />
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Founding tradie banner ────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.foundingCard, { backgroundColor: c.primaryBg, borderColor: c.primary + '4D' }]}>
            <View style={[styles.foundingPill, { backgroundColor: c.primary }]}>
              <HeroIcon d={STAR_SOLID_PATH} size={14} color="#ffffff" solid />
              <Text style={styles.foundingPillText}>Founding Tradie programme</Text>
            </View>
            <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary, marginTop: Spacing.md }]} accessibilityRole="header">
              Free until 3 homeowners contact you.
            </Text>
            <Text style={[styles.bodySm, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.sm }]}>
              You&apos;re only billed after BLDESY has actually brought you work — and we message you before your
              first charge. Join as one of the first 200 tradies and you also lock in today&apos;s launch rates
              forever, with a permanent Founding Tradie badge on your profile.
            </Text>
          </View>
        </View>

        {/* ── Why BLDESY — three-card differentiator strip ───────────── */}
        <View style={[styles.section, { gap: Spacing.lg }]}>
          <WhyCard
            tone={c.primary}
            icon="dollar"
            title="Flat fee. No per-lead pricing."
            body="One subscription, unlimited enquiries. No paying $30–$80 each time you quote — and no lead sold to 4 other tradies at the same time."
          />
          <WhyCard
            tone={INDIGO_500}
            icon="shield"
            title="Checked at the source, not self-declared."
            body={`We check every tradie five ways — ${FIVE_CHECKS_LIST} — against real registers like the ABR and NSW Fair Trading. The verified badge means something.`}
          />
          <WhyCard
            tone={AMBER_500}
            icon="bolt"
            title="Inner Sydney first."
            body="We're launching deep in one market instead of thin everywhere — so every tradie who joins gets concentrated local demand from verified homeowners."
          />
        </View>

        {/* ── Tier intro + billing-interval toggle ──────────────────── */}
        <View style={[styles.section, styles.center]}>
          <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
            Four tiers, sized by trade coverage.
          </Text>
          <Text style={[styles.bodySm, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.sm }]}>
            Every tier gets the same platform — verified profile, unlimited enquiries, messaging, portfolio. You pay
            for the size of your business, and we match your tier automatically when you sign up.
          </Text>

          {CAN_SELL_IN_APP ? (
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: interval === 'monthly' ? c.textPrimary : c.textSecondary }]}>
                Monthly
              </Text>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Bill annually"
                accessibilityState={{ checked: interval === 'annual' }}
                onPress={() => setInterval(interval === 'annual' ? 'monthly' : 'annual')}
                style={[styles.switchTrack, { backgroundColor: interval === 'annual' ? c.primary : c.border }]}
              >
                <View style={[styles.switchKnob, { transform: [{ translateX: interval === 'annual' ? 22 : 2 }] }]} />
              </Pressable>
              <Text style={[styles.toggleLabel, { color: interval === 'annual' ? c.textPrimary : c.textSecondary }]}>
                Annual
              </Text>
              <View style={[styles.freeChip, Shadows.sm, { backgroundColor: c.success + '26' }]}>
                <HeroIcon d={STAR_SOLID_PATH} size={14} color={c.success} solid />
                <Text style={[styles.freeChipText, { color: c.success }]}>2 months free</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Tier cards (Android) ──────────────────────────────────── */}
        {CAN_SELL_IN_APP ? (
          <View style={[styles.section, { paddingTop: 0, gap: Spacing.xl }]}>
            {TRADIE_TIERS.map((tier) => (
              <TradieTierCard key={tier.key} tier={tier} interval={interval} onStart={join} />
            ))}
          </View>
        ) : null}

        {/* ── Compare-against callouts (Android) ────────────────────── */}
        {CAN_SELL_IN_APP ? (
          <View style={styles.section}>
            <View style={[styles.center, { marginBottom: Spacing['2xl'] }]}>
              <Text style={[styles.eyebrow, { color: c.primary, marginBottom: Spacing.sm }]}>What you&apos;d pay elsewhere</Text>
              <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary }]} accessibilityRole="header">
                BLDESY vs the alternatives
              </Text>
              <Text style={[styles.bodySm, styles.textCenter, { color: c.textSecondary, marginTop: Spacing.sm }]}>
                Real per-year totals for a solo tradie quoting every week. Side-by-side, not cherry-picked.
              </Text>
            </View>
            <View style={{ gap: Spacing.xl }}>
              <CompareCard
                name="Lead-credit platforms"
                price="$200–$600/mo"
                sub="credits you never get back — each lead shared with 4–6 tradies"
                saveLine="Trade tier $39/mo flat. No credits, nothing to win back."
                accent={ROSE_400}
              />
              <CompareCard
                name="Trade directories"
                price="$66+/mo"
                sub="a membership fee just to be listed — the work never enters it"
                saveLine="Specialist $69/mo covers 2–3 trades, unlimited enquiries"
                accent={AMBER_400}
              />
              <CompareCard
                name="The per-lead model"
                price="$30–$80 per lead"
                sub="pay for every enquiry, win or lose the job"
                saveLine="BLDESY: $0 per lead, on every tier"
                accent={INDIGO_400}
              />
            </View>
          </View>
        ) : null}

        {/* ── Bottom CTA — gradient block ───────────────────────────── */}
        <View style={styles.section}>
          <LinearGradient
            colors={[c.primary, EMERALD_500, c.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bottomCta, Shadows.lg]}
          >
            <Text style={styles.bottomEyebrow}>Stop paying per lead</Text>
            <Text style={styles.bottomTitle} accessibilityRole="header">
              Join the founding tradies.
            </Text>
            <Text style={styles.bottomBody}>
              First 200 tradies lock in launch rates forever and keep a permanent Founding Tradie badge. Free until 3
              homeowners contact you — no card needed to start.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={join}
              style={({ pressed }) => [styles.whitePill, Shadows.md, pressed && { backgroundColor: c.canvas }]}
            >
              <Text style={[styles.whitePillLabel, { color: c.primary }]}>Join as a tradie</Text>
              <HeroIcon d={ARROW_RIGHT_PATH} size={16} color={c.primary} strokeWidth={2} />
            </Pressable>
          </LinearGradient>
        </View>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <View style={[styles.section, { paddingBottom: Spacing['6xl'] + Spacing['2xl'] }]}>
          <Text style={[styles.h2, styles.textCenter, { color: c.textPrimary, marginBottom: Spacing['2xl'] }]} accessibilityRole="header">
            Frequently asked
          </Text>
          <View style={{ gap: Spacing.md }}>
            {FAQS.map((faq, i) => (
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

        <Footer />
      </ScrollView>
    </AppShell>
  );
}

/* ── Tier cards ──────────────────────────────────────────────────── */

function TradieTierCard({
  tier,
  interval,
  onStart,
}: {
  tier: TradieTier;
  interval: BillingInterval;
  onStart: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const isAnnual = interval === 'annual';
  const isFeatured = tier.badge === 'most_popular';
  const saving = isAnnual
    ? { amount: annualSavings(tier.monthly, tier.annual), percent: annualSavingsPercent(tier.monthly, tier.annual) }
    : null;
  const priceSub = isAnnual
    ? `$${(tier.annual / 12).toFixed(0)}/mo billed annually`
    : `$${(tier.monthly * 12).toLocaleString('en-AU')}/year if billed monthly`;

  return (
    <View
      style={[
        styles.tierCard,
        isFeatured ? Shadows.lg : Shadows.sm,
        {
          backgroundColor: c.surface,
          borderColor: isFeatured ? c.primary : c.border,
          borderWidth: isFeatured ? 2 : 1,
        },
      ]}
    >
      {tier.badge ? (
        <View style={styles.tierBadgeWrap}>
          <View style={[styles.tierBadge, { backgroundColor: tier.badge === 'most_popular' ? c.primary : AMBER_500 }]}>
            <Text style={styles.tierBadgeText}>{tier.badge === 'most_popular' ? 'Most popular' : 'Best value'}</Text>
          </View>
        </View>
      ) : null}

      <Text style={[styles.tierName, { color: c.textPrimary }]}>{tier.name}</Text>
      <Text style={[styles.tierTagline, { color: c.primary }]}>{tier.tagline}</Text>
      <Text style={[styles.bodySm, { color: c.textSecondary, marginTop: Spacing.md }]}>{tier.bestFor}</Text>

      <View style={{ marginTop: Spacing.xl }}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: c.textPrimary }]}>
            ${isAnnual ? tier.annual.toLocaleString('en-AU') : tier.monthly}
          </Text>
          <Text style={[styles.pricePer, { color: c.textSecondary }]}>{isAnnual ? '/year' : '/month'}</Text>
        </View>
        <Text style={[styles.priceSub, { color: c.textSecondary }]}>{priceSub}</Text>
        {saving && saving.amount > 0 ? (
          <View style={[styles.saveChip, { backgroundColor: c.success + '26' }]}>
            <HeroIcon
              d="M5.293 9.707a1 1 0 011.414 0L9 12l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              size={12}
              color={c.success}
              solid
            />
            <Text style={[styles.saveChipText, { color: c.success }]}>
              Save ${saving.amount.toLocaleString('en-AU')} ({saving.percent}% off)
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: Spacing.xl }}>
        <Button variant={isFeatured ? 'primary' : 'secondary'} size="md" fullWidth onPress={onStart}>
          Start with this tier
        </Button>
      </View>

      {tier.competitorNote ? (
        <Text style={[styles.competitorNote, { color: c.textSecondary }]}>{tier.competitorNote}</Text>
      ) : null}

      <View style={[styles.features, { borderTopColor: c.border }]}>
        {tier.features.map((f) => (
          <View key={f} style={styles.tickRow}>
            <Tick color={c.primary} />
            <Text style={[styles.bodySm, { color: c.textSecondary, flex: 1 }]}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── Small bits ──────────────────────────────────────────────────── */

function Tick({ color }: { color: string }) {
  return <HeroIcon d={TICK_SOLID_PATH} size={20} color={color} solid style={{ marginTop: 1 }} />;
}

function CompareCard({
  name,
  price,
  sub,
  saveLine,
  accent,
}: {
  name: string;
  price: string;
  sub: string;
  saveLine: string;
  accent: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.compareCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.compareBar, { backgroundColor: accent }]} />
      <View style={styles.compareBody}>
        <Text style={[styles.compareName, { color: c.textSecondary }]}>{name}</Text>
        <Text style={[styles.comparePrice, { color: c.textPrimary, textDecorationColor: ROSE_300 }]}>{price}</Text>
        <Text style={[styles.compareSub, { color: c.textSecondary }]}>{sub}</Text>
        <View style={[styles.saveBox, { borderColor: c.success + '33', backgroundColor: c.success + '0D' }]}>
          <Text style={[styles.saveBoxLabel, { color: c.success }]}>BLDESY</Text>
          <Text style={[styles.saveBoxText, { color: c.textPrimary }]}>{saveLine}</Text>
        </View>
      </View>
    </View>
  );
}

function TrustChip({ icon, children }: { icon: 'shield' | 'bolt'; children: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.trustChip}>
      <HeroIcon d={icon === 'shield' ? SHIELD_SOLID_PATH : BOLT_SOLID_PATH} size={14} color={c.primary} solid />
      <Text style={[styles.trustChipText, { color: c.textSecondary }]}>{children}</Text>
    </View>
  );
}

function WhyCard({
  tone,
  icon,
  title,
  body,
}: {
  tone: string;
  icon: 'dollar' | 'shield' | 'bolt';
  title: string;
  body: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const d = icon === 'dollar' ? DOLLAR_SOLID_PATHS : icon === 'shield' ? SHIELD_SOLID_PATH : BOLT_SOLID_PATH;
  return (
    <View style={[styles.whyCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View pointerEvents="none" style={[styles.whyGlow, { backgroundColor: tone + '26' }]} />
      <View style={[styles.whyIcon, { backgroundColor: c.canvas }]}>
        <HeroIcon d={d} size={20} color={tone} solid />
      </View>
      <Text style={[styles.whyTitle, { color: c.textPrimary }]}>{title}</Text>
      <Text style={[styles.bodySm, { color: c.textSecondary }]}>{body}</Text>
    </View>
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
    paddingBottom: Spacing['3xl'],
  },
  heroWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 480,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['5xl'] + Spacing.sm,
    paddingBottom: Spacing['4xl'],
  },
  pricingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pricingPillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  h1: {
    marginTop: Spacing.xl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  lede: {
    marginTop: Spacing.xl,
    maxWidth: 600,
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
  strong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  trustChips: {
    marginTop: Spacing['3xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing['2xl'],
    rowGap: Spacing.md,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tickList: {
    gap: Spacing.sm,
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bodySm: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 21,
  },
  outlinePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 2,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 10,
  },
  outlinePillLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  foundingCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.xl,
  },
  foundingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  foundingPillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  h2: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 30,
  },
  whyCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  whyGlow: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 128,
    height: 128,
    borderRadius: 64,
    opacity: 0.8,
  },
  whyIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  whyTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  toggleRow: {
    marginTop: Spacing['2xl'] + Spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  toggleLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    ...Shadows.sm,
  },
  freeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  freeChipText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tierCard: {
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
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
    fontSize: 11,
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
  tierTagline: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 36,
    lineHeight: 40,
  },
  pricePer: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  priceSub: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  saveChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveChipText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  competitorNote: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.body,
    fontStyle: 'italic',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  features: {
    marginTop: Spacing['2xl'],
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    gap: 10,
  },
  compareCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compareBar: {
    height: 6,
  },
  compareBody: {
    padding: Spacing.xl,
  },
  compareName: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  comparePrice: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 32,
    textDecorationLine: 'line-through',
  },
  compareSub: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 17,
  },
  saveBox: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveBoxLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  saveBoxText: {
    marginTop: 2,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 17,
  },
  bottomCta: {
    alignItems: 'center',
    borderRadius: Radius['2xl'],
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['3xl'],
    overflow: 'hidden',
  },
  bottomEyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md,
  },
  bottomTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
    color: '#ffffff',
  },
  bottomBody: {
    marginTop: Spacing.md,
    maxWidth: 560,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
  },
  whitePill: {
    marginTop: Spacing['2xl'] + Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing['3xl'] - Spacing.xs,
    paddingVertical: 12,
  },
  whitePillLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
});
