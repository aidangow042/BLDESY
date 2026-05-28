/**
 * For Tradies marketing page. Condensed mobile version of
 * `~/bldesy-web/app/for-tradies/page.tsx`.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppShell } from '@/components/layout';
import { Badge, Button, Card, CountUp } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PERKS = [
  { glyph: '💸', title: 'No commission, no per-lead fees', body: 'Flat monthly subscription. Keep 100% of what you earn from every job you win.' },
  { glyph: '🪪', title: 'Verified profile that stands out', body: 'ABN, licence, and insurance verification displays as trust badges on your profile.' },
  { glyph: '🎯', title: 'AI-matched job recommendations', body: 'Get notified about jobs that fit your trade, location, and capability — no spam.' },
  { glyph: '📊', title: 'Real analytics, not vanity metrics', body: 'Track profile views, search appearances, and application conversion. See what works.' },
];

const STATS = [
  { value: 16000, suffix: '+', label: 'Suburbs covered' },
  { value: 50,    suffix: '+', label: 'Trade categories' },
  { value: 24,    prefix: '<', suffix: 'h', label: 'First job views' },
  { value: 0,     prefix: '$', suffix: '',  label: 'Per-lead fees' },
];

const STEPS = [
  { number: '1', title: 'Sign up + verify',    description: 'Create your account, verify your ABN, and upload your licence + insurance.' },
  { number: '2', title: 'Build your profile',  description: 'Add photos, specialties, service area, and team members. Subscribe to go live.' },
  { number: '3', title: 'Apply to jobs',       description: 'Browse matched jobs daily. Apply with one tap. Customers reach out directly.' },
];

export default function ForTradiesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <AppShell title="For tradies" showBack>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Badge variant="primary">For licensed tradies</Badge>
          <Text style={[styles.heading, { color: c.textPrimary }]}>
            More jobs, <Text style={{ color: c.primary }}>fairer pricing.</Text>
          </Text>
          <Text style={[styles.subhead, { color: c.textSecondary }]}>
            Flat subscription. No commission. No bidding wars. Just customers who need you.
          </Text>
          <View style={styles.ctaRow}>
            <Button variant="primary" size="lg" onPress={() => router.push('/builder-signup' as any)}>
              Join BLDESY!
            </Button>
            <Button variant="ghost" size="lg" onPress={() => router.push('/pricing' as any)}>
              See pricing
            </Button>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <Card key={s.label} padding={Spacing.lg} style={styles.statCard}>
              <View style={styles.statValueRow}>
                {s.prefix ? <Text style={[styles.statPrefix, { color: c.primary }]}>{s.prefix}</Text> : null}
                <CountUp value={s.value} style={[styles.statValue, { color: c.primary }]} />
                <Text style={[styles.statSuffix, { color: c.primary }]}>{s.suffix}</Text>
              </View>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* Perks */}
        <View style={{ gap: Spacing.md }}>
          <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: Spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Why tradies pick BLDESY</Text>
          </View>
          <View style={styles.perksGrid}>
            {PERKS.map((p) => (
              <Card key={p.title} padding={Spacing.lg} style={styles.perkCard}>
                <Text style={styles.perkGlyph}>{p.glyph}</Text>
                <Text style={[styles.perkTitle, { color: c.textPrimary }]}>{p.title}</Text>
                <Text style={[styles.perkBody, { color: c.textSecondary }]}>{p.body}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Steps */}
        <View style={{ gap: Spacing.md }}>
          <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: Spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>How to get started</Text>
          </View>
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
        </View>

        {/* Bottom CTA */}
        <Card padding={Spacing['3xl']} style={[styles.bottomCta, { backgroundColor: c.primaryBg, borderColor: c.primary + '33' }]}>
          <Text style={[styles.bottomCtaHead, { color: c.textPrimary }]}>Ready to win more work?</Text>
          <Text style={[styles.bottomCtaCopy, { color: c.textSecondary }]}>
            First month is risk-free. Cancel anytime — no lock-in.
          </Text>
          <Button variant="primary" size="lg" fullWidth onPress={() => router.push('/builder-signup' as any)}>
            Join as a tradie
          </Button>
        </Card>
      </ScrollView>
    </AppShell>
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
  perksGrid: {
    gap: Spacing.md,
  },
  perkCard: {
    gap: Spacing.sm,
  },
  perkGlyph: {
    fontSize: 28,
  },
  perkTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 15,
  },
  perkBody: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 20,
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
