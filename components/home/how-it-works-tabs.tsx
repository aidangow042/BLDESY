/**
 * HowItWorksTabs — ~/bldesy-web/components/home/how-it-works-tabs.tsx: "How
 * BLDESY works" for both consumer fronts. Two mini-panel title tabs
 * (Homeowners amber / Tradies primary) switch the 3 steps with their feature
 * pills, a per-tab link (the demo walk-through / the onboarding hand-off) and
 * an audience-aware trust strip. Copy verbatim.
 */
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { WEB_PAGES } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { FIVE_CHECKS_LIST } from '@/lib/web/verification-copy';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type FrontKey = 'homeowner' | 'tradie';

/* Tailwind amber-500 / amber-700 / amber-600 — the homeowner accent. */
const AMBER = { fill: '#f59e0b', text: '#b45309', check: '#d97706' } as const;

interface Step {
  title: string;
  body: string;
  pills: string[];
  icon: IoniconName;
}

interface Front {
  key: FrontKey;
  title: string;
  steps: Step[];
  trust: string[];
  link: { label: string; kind: 'demo' | 'onboarding' };
}

const FRONTS: Front[] = [
  {
    key: 'homeowner',
    title: 'Homeowners',
    steps: [
      {
        title: "See who's near you",
        body: 'Search any trade and suburb, browse the map, or ask the AI assistant to point you at the right trade.',
        pills: ['Map search', 'AI assistant'],
        icon: 'search-outline',
      },
      {
        title: 'Check them — five ways',
        body: `Every tradie's badge shows all five checks — ${FIVE_CHECKS_LIST} — plus their real work photos, prices and specialties, so you know exactly who you're dealing with before you reach out.`,
        pills: ['Verification ticks', 'Full profiles'],
        icon: 'shield-checkmark-outline',
      },
      {
        title: 'Choose and contact direct',
        body: 'Message any tradie direct, post a job for tradies to come to you, and compare quotes. No lead fees, no middleman.',
        pills: ['Message direct', 'Post a job', 'Compare quotes'],
        icon: 'chatbubble-ellipses-outline',
      },
    ],
    trust: ['Checked five ways', 'Real work photos', 'Yours to choose'],
    link: { label: 'See how it works', kind: 'demo' },
  },
  {
    key: 'tradie',
    title: 'Tradies',
    steps: [
      {
        title: 'One profile, fully verified',
        body: `${FIVE_CHECKS_LIST} — checked once. Build one extensive profile — trades, service area, portfolio — that works across every job type, residential and commercial.`,
        pills: ['Verified once', 'Residential + commercial'],
        icon: 'shield-checkmark-outline',
      },
      {
        title: 'Seen by homeowners and builders',
        body: 'Homeowners and businesses search and find you directly. The more complete your profile, the higher you surface.',
        pills: ['Homeowner search', 'Business search'],
        icon: 'people-outline',
      },
      {
        title: 'Win any job or contract',
        body: 'Apply to one-off jobs and ongoing contracts yourself, or get contacted direct. Flat fee, no per-lead charges.',
        pills: ['Apply direct', 'Flat fee'],
        icon: 'briefcase-outline',
      },
    ],
    trust: ['One profile', 'Seen by both sides', 'Apply to any job', 'Flat fee'],
    link: { label: 'Start your profile', kind: 'onboarding' },
  },
];

export function HowItWorksTabs() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [active, setActive] = useState<FrontKey>('homeowner');
  const current = FRONTS.find((f) => f.key === active) ?? FRONTS[0];

  const accent =
    active === 'homeowner'
      ? { fill: AMBER.fill, text: AMBER.text, check: AMBER.check, panelBg: 'rgba(245,158,11,0.10)' }
      : { fill: c.primary, text: c.primary, check: c.primary, panelBg: c.primaryBg };

  function followLink() {
    if (current.link.kind === 'demo') {
      WebBrowser.openBrowserAsync(WEB_PAGES.demo).catch(() => {});
      return;
    }
    trackFunnelEvent('tradie_signup_cta_tapped', { via: 'how_it_works' });
    openWebOnboarding('builder').catch(() => {});
  }

  return (
    <View style={[styles.section, { backgroundColor: c.surface }]}>
      <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
        How BLDESY works
      </Text>
      <Text style={[styles.lead, { color: c.textSecondary }]}>
        Find a checked tradie in three steps. Here&apos;s how it works from the day your suburb opens.
      </Text>

      {/* Two mini-panel title tabs */}
      <View accessibilityRole="tablist" style={styles.tabs}>
        {FRONTS.map((f) => {
          const selected = active === f.key;
          const tone = f.key === 'homeowner' ? AMBER : { fill: c.primary, text: c.primary };
          return (
            <Pressable
              key={f.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActive(f.key)}
              style={[
                styles.tab,
                selected
                  ? [
                      { borderColor: tone.fill, backgroundColor: f.key === 'homeowner' ? 'rgba(245,158,11,0.10)' : c.primaryBg },
                      Shadows.sm,
                    ]
                  : { borderColor: c.border, backgroundColor: c.surface },
              ]}
            >
              <View style={[styles.tabDot, { backgroundColor: selected ? tone.fill : '#cbd5e1' }]} />
              <Text style={[styles.tabText, { color: selected ? tone.text : c.textSecondary }]}>{f.title}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* The selected front's 3 steps */}
      <View style={styles.steps}>
        {current.steps.map((step, i) => (
          <View key={step.title} style={styles.step}>
            <View style={[styles.stepCircle, Shadows.sm, { backgroundColor: accent.fill }]}>
              <Ionicons name={step.icon} size={24} color="#fff" />
              <View style={[styles.stepNumber, Shadows.sm]}>
                <Text style={[styles.stepNumberText, { color: accent.check }]}>{i + 1}</Text>
              </View>
            </View>
            <Text style={[styles.stepTitle, { color: c.textPrimary }]}>{step.title}</Text>
            <Text style={[styles.stepBody, { color: c.textSecondary }]}>{step.body}</Text>
            <Text style={[styles.stepPills, { color: accent.check }]}>{step.pills.join(' · ')}</Text>
          </View>
        ))}
      </View>

      <Pressable accessibilityRole="link" onPress={followLink} hitSlop={6} style={styles.linkWrap}>
        <Text style={[styles.link, { color: accent.check }]}>{current.link.label} →</Text>
      </Pressable>

      {/* Audience-aware trust strip */}
      <View style={[styles.trust, { borderTopColor: c.border + 'B3' }]}>
        {current.trust.map((t) => (
          <View key={t} style={styles.trustItem}>
            <Ionicons name="checkmark" size={16} color={accent.check} />
            <Text style={[styles.trustText, { color: c.textPrimary }]}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 56,
  },
  h2: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  lead: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  tabs: {
    marginTop: Spacing['3xl'],
    flexDirection: 'row',
    gap: Spacing.sm,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 384,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  steps: {
    marginTop: Spacing['5xl'],
    gap: Spacing['3xl'],
  },
  step: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  stepNumber: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  stepNumberText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 11,
  },
  stepTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  stepBody: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  stepPills: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  linkWrap: {
    marginTop: Spacing['3xl'],
    alignSelf: 'center',
  },
  link: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  trust: {
    marginTop: Spacing['4xl'],
    borderTopWidth: 1,
    paddingTop: Spacing['3xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing['3xl'],
    rowGap: 10,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trustText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
});
