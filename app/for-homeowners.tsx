/**
 * /for-homeowners — port of ~/bldesy-web/app/for-homeowners/page.tsx: the
 * coverage page. Answers "is my suburb in?", shows the launch zones on a
 * schematic map, and captures a waitlist signup with the searched suburb
 * attached.
 *
 * Deliberately NO tradie counts or supply numbers anywhere on this page —
 * "spots are being filled" is the strongest claim allowed. Everything below
 * the hero is future tense on purpose.
 */
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CoverageExplorer, CoverageProvider, HomeownerWaitlist } from '@/components/coverage';
import { AppShell } from '@/components/layout';
import { Footer } from '@/components/layout/footer';
import { GradientHero, HeroIcon, PingDot } from '@/components/marketing';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FIVE_CHECKS_LIST } from '@/lib/web/verification-copy';

/** ~/bldesy-web/lib/prelaunch.ts LAUNCH_LABEL — the hero pill (not in the sync mirror). */
const LAUNCH_LABEL = 'COMING SUMMER 2026 — INNER SYDNEY';

const AMBER_400 = '#fbbf24';
const EMERALD_950 = '#022c22';

const AT_LAUNCH = [
  {
    title: 'Checked five ways',
    body: `Every tradie will be checked five ways — ${FIVE_CHECKS_LIST} — before they appear, with the badge visible on their profile.`,
    icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
  },
  {
    title: 'AI assist',
    body: 'Describe the job in plain words — a dripping wall, a sagging deck — and it points you at the right trade.',
    icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z',
  },
  {
    title: 'Maps that tell the truth',
    body: 'The map shows who actually covers your suburb — not who paid to appear at the top.',
    icon: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
  },
  {
    title: 'Filters that matter, you choose',
    body: "Filter by trade, area, availability and past work — see their jobs and their prices, then you send the message, you pick who turns up. You're never sold as a lead.",
    icon: 'M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z',
  },
];

export default function ForHomeownersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);
  const formY = useRef(0);

  function scrollToForm() {
    scrollRef.current?.scrollTo({ y: Math.max(0, formY.current - Spacing.md), animated: true });
  }

  return (
    <AppShell title="See if your suburb's covered" showBack>
      <CoverageProvider>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Hero — the /for-tradies gradient treatment with this page's copy.
              Extra bottom padding so the search+map card overlaps the hero edge. */}
          <GradientHero style={styles.hero}>
            <View style={styles.heroInner}>
              <View style={styles.launchPill}>
                <PingDot color="#ffffff" />
                <Text style={styles.launchPillText}>{LAUNCH_LABEL}</Text>
              </View>
              <Text style={styles.h1} accessibilityRole="header">
                See if you&rsquo;re covered.
              </Text>
              <Text style={styles.lede}>
                We&rsquo;re verifying tradies across Inner Sydney right now, area by area. Find your suburb and
                we&rsquo;ll tell you where yours is up to.
              </Text>
            </View>
          </GradientHero>

          {/* Coverage explorer — search, answer, map. Overlaps the hero band. */}
          <View style={styles.explorerWrap}>
            <View style={[styles.explorerCard, Shadows.xl, { backgroundColor: c.surface, borderColor: c.border }]}>
              <CoverageExplorer onJoin={scrollToForm} />
            </View>
          </View>

          {/* What you'll get at launch */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.eyebrowPill, { backgroundColor: c.primaryBg }]}>
                <Text style={[styles.eyebrow, { color: c.primary }]}>At launch</Text>
              </View>
              <Text style={[styles.h2, { color: c.textPrimary }]} accessibilityRole="header">
                What you&rsquo;ll get when your area opens
              </Text>
              <Text style={[styles.sectionSub, { color: c.textSecondary }]}>
                Nothing below is live yet — this is what switches on the day verified tradies cover your suburb.
              </Text>
            </View>
            <View style={styles.cards}>
              {AT_LAUNCH.map((card) => (
                <View key={card.title} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={[styles.cardIcon, { backgroundColor: c.primaryBg }]}>
                    <HeroIcon d={card.icon} size={20} color={c.primary} />
                  </View>
                  <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{card.title}</Text>
                  <Text style={[styles.cardBody, { color: c.textSecondary }]}>{card.body}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Waitlist capture — the shared form, suburb prefilled from the search */}
          <View style={styles.waitlistWrap} onLayout={(e) => (formY.current = e.nativeEvent.layout.y)}>
            <HomeownerWaitlist />
          </View>

          <Footer />
        </ScrollView>
      </CoverageProvider>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 0,
  },
  hero: {
    paddingBottom: Spacing['6xl'] * 2,
  },
  heroInner: {
    alignItems: 'center',
  },
  launchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: AMBER_400,
    paddingHorizontal: 16,
    paddingVertical: 6,
    ...Shadows.md,
  },
  launchPillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: EMERALD_950,
  },
  h1: {
    marginTop: Spacing['2xl'],
    fontFamily: FontFamily.display,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.5,
    textAlign: 'center',
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
  explorerWrap: {
    marginTop: -Spacing['6xl'],
    paddingHorizontal: Spacing.lg,
  },
  explorerCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  sectionHead: {
    alignItems: 'center',
  },
  eyebrowPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  h2: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  sectionSub: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  cards: {
    marginTop: Spacing['4xl'],
    gap: Spacing.lg,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  cardBody: {
    marginTop: 6,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  waitlistWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['6xl'] + Spacing.lg,
  },
});
