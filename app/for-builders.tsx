/**
 * For Builders marketing page. Condensed mobile version of
 * `~/bldesy-web/app/for-builders/page.tsx` — stats, steps, comparison, CTA.
 * Full FAQ + testimonials sections were trimmed to keep the screen scannable
 * on mobile.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppShell } from '@/components/layout';
import { Badge, Button, Card, CountUp } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STATS = [
  { value: 50,    suffix: '+',  label: 'Trade categories' },
  { value: 16000, suffix: '+',  label: 'Suburbs covered' },
  { value: 100,   suffix: '%',  label: 'ABN verified' },
  { value: 24,    prefix: '<',  suffix: 'h', label: 'First applications' },
];

const STEPS = [
  { number: '1', title: 'Register as a builder', description: 'Sign up, verify your ABN, and set up your builder account in minutes.' },
  { number: '2', title: 'Post project jobs',     description: 'Describe what you need — workers, trade, duration, day rate, site requirements.' },
  { number: '3', title: 'Hire qualified tradies', description: 'Review applications, accept the best fits, and get your project staffed fast.' },
];

const COMPARE = [
  { feature: 'Cost model',     oldWay: 'Pay $30–80 per lead',          bldesy: 'Flat subscription, unlimited jobs' },
  { feature: 'Pricing control', oldWay: 'Bidding wars drive up costs',  bldesy: 'You set the day rate' },
  { feature: 'Tradie quality',  oldWay: 'Unverified random tradies',     bldesy: 'ABN + licence verified' },
  { feature: 'Speed',           oldWay: 'Wait days for quotes',          bldesy: 'Applications within 24 hours' },
];

export default function ForBuildersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <AppShell title="For builders" showBack>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Badge variant="primary">For builders & developers</Badge>
          <Text style={[styles.heading, { color: c.textPrimary }]}>
            Hire verified subbies, <Text style={{ color: c.primary }}>without the agency mark-up.</Text>
          </Text>
          <Text style={[styles.subhead, { color: c.textSecondary }]}>
            Post project jobs. Get applications from ABN- and licence-verified tradies within 24 hours.
          </Text>
          <View style={styles.ctaRow}>
            <Button variant="primary" size="lg" onPress={() => router.push('/enterprise-signup' as any)}>
              Get started
            </Button>
            <Button variant="ghost" size="lg" onPress={() => router.push('/pricing' as any)}>
              See pricing
            </Button>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <Card key={s.label} padding={Spacing.lg} style={styles.statCard}>
              <View style={styles.statValueRow}>
                {s.prefix ? (
                  <Text style={[styles.statPrefix, { color: c.primary }]}>{s.prefix}</Text>
                ) : null}
                <CountUp value={s.value} style={[styles.statValue, { color: c.primary }]} />
                <Text style={[styles.statSuffix, { color: c.primary }]}>{s.suffix}</Text>
              </View>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* Steps */}
        <Section title="How it works" subtitle="Three steps from signup to staffed">
          <View style={styles.steps}>
            {STEPS.map((step) => (
              <Card key={step.number} padding={Spacing.lg}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepBadge, { backgroundColor: c.primary }]}>
                    <Text style={styles.stepNumber}>{step.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepTitle, { color: c.textPrimary }]}>{step.title}</Text>
                    <Text style={[styles.stepDesc, { color: c.textSecondary }]}>{step.description}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </Section>

        {/* Comparison table */}
        <Section title="The old way vs BLDESY" subtitle="Why builders are switching">
          <Card padding={0} style={{ overflow: 'hidden' }}>
            {COMPARE.map((row, i) => (
              <View
                key={row.feature}
                style={[
                  styles.compareRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                ]}
              >
                <Text style={[styles.compareFeature, { color: c.textSecondary }]}>{row.feature}</Text>
                <View style={styles.compareCells}>
                  <View style={styles.compareCell}>
                    <Text style={[styles.compareCellLabel, { color: c.textSecondary }]}>Old way</Text>
                    <Text style={[styles.compareOld, { color: c.textPrimary }]}>{row.oldWay}</Text>
                  </View>
                  <View style={styles.compareCell}>
                    <Text style={[styles.compareCellLabel, { color: c.primary }]}>BLDESY</Text>
                    <Text style={[styles.compareNew, { color: c.textPrimary }]}>{row.bldesy}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </Section>

        {/* Bottom CTA */}
        <Card padding={Spacing['3xl']} style={[styles.bottomCta, { backgroundColor: c.primaryBg, borderColor: c.primary + '33' }]}>
          <Text style={[styles.bottomCtaHead, { color: c.textPrimary }]}>Ready to staff your next project?</Text>
          <Text style={[styles.bottomCtaCopy, { color: c.textSecondary }]}>
            Free to register. Pay only when you start posting jobs.
          </Text>
          <Button variant="primary" size="lg" fullWidth onPress={() => router.push('/enterprise-signup' as any)}>
            Register your company
          </Button>
        </Card>
      </ScrollView>
    </AppShell>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={{ gap: Spacing.md }}>
      <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: Spacing.lg }}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSub, { color: c.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing['3xl'],
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  heading: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subhead: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    maxWidth: 380,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statPrefix: {
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  statValue: {
    fontSize: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statSuffix: {
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 22,
    textAlign: 'center',
  },
  sectionSub: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    textAlign: 'center',
  },
  steps: {
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 16,
  },
  stepTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  stepDesc: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 20,
  },
  compareRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  compareFeature: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  compareCells: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  compareCell: {
    flex: 1,
    gap: 4,
  },
  compareCellLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  compareOld: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
  compareNew: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  bottomCta: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  bottomCtaHead: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 20,
    textAlign: 'center',
  },
  bottomCtaCopy: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
