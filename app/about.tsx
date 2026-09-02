/**
 * /about — port of ~/bldesy-web/app/about/page.tsx.
 */
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/layout';
import { Footer } from '@/components/layout/footer';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FIVE_CHECKS } from '@/lib/web/verification-copy';

export default function AboutScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <AppShell title="About" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.main}>
          <Text style={[styles.h1, { color: c.textPrimary }]} accessibilityRole="header">
            About BLDESY
          </Text>
          <Text style={[styles.lead, { color: c.textSecondary }]}>
            BLDESY is an Australian trade marketplace built to make finding a qualified tradie simple — and to give
            tradies a fairer way to grow their business.
          </Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Homeowners are trusting a stranger with their house, and most directories ask you to take that on faith —
            a self-declared licence number, a rating from an unverified account, a photo pulled from anywhere.
            Tradies, meanwhile, are stuck paying per lead on platforms that sell the same job to five other people.
            We built BLDESY to fix both sides at once: real verification for homeowners, and a flat, fair
            subscription for tradies instead of a toll on every enquiry.
          </Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            No per-lead fees, no commission on jobs — tradies pay a flat monthly subscription, and homeowners never
            pay a cent.
          </Text>

          <Text style={[styles.h2, { color: c.textPrimary }]} accessibilityRole="header">
            The five checks
          </Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Every tradie on BLDESY is checked five ways before their profile goes live — not self-declared, actually
            verified:
          </Text>
          <View style={styles.list} accessibilityRole="list">
            {FIVE_CHECKS.map((check) => (
              <Text key={check.name} style={[styles.body, styles.listItem, { color: c.textSecondary }]}>
                <Text style={[styles.strong, { color: c.textPrimary }]}>{check.name}</Text> — {check.detail}.
              </Text>
            ))}
          </View>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Trades that don&apos;t carry a licence in NSW — cleaning, for example — are still ABN-checked, ID-matched
            and insurance-checked; the licence and White Card checks just don&apos;t apply to that trade.
          </Text>

          <Text style={[styles.h2, { color: c.textPrimary }]} accessibilityRole="header">
            Who&apos;s behind it
          </Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            BLDESY is operated by BLDESY PTY LTD (ABN 11 698 416 705, ACN 698 416 705), based in Sydney, New South
            Wales. We&apos;re launching in inner Sydney first and expanding suburb by suburb from there.
          </Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Questions, feedback, or want to talk to a real person? Get in touch at{' '}
            <Text
              accessibilityRole="link"
              onPress={() => Linking.openURL('mailto:hello@bldesy.com.au').catch(() => {})}
              style={[styles.strong, { color: c.primary }]}
            >
              hello@bldesy.com.au
            </Text>
            .
          </Text>
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
  main: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  h1: {
    fontFamily: FontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    marginBottom: Spacing.lg,
  },
  h2: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    lineHeight: 28,
    marginTop: Spacing['4xl'],
    marginBottom: Spacing.lg,
  },
  lead: {
    fontFamily: FontFamily.body,
    fontSize: 18,
    lineHeight: 29,
    marginBottom: Spacing['2xl'],
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: Spacing['2xl'],
  },
  list: {
    marginBottom: Spacing.sm,
  },
  listItem: {
    marginBottom: Spacing.sm,
  },
  strong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
