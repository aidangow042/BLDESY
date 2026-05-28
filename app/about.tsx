/**
 * About page. Mirrors `~/bldesy-web/app/about/page.tsx`.
 */

import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/layout';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AboutScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <AppShell title="About" showBack>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: c.textPrimary }]}>About BLDESY</Text>

        <Text style={[styles.body, styles.lead, { color: c.textSecondary }]}>
          BLDESY is an Australian trade marketplace built to make finding a qualified tradie simple — and to give tradies a fairer way to grow their business.
        </Text>

        <Text style={[styles.body, { color: c.textSecondary }]}>
          We verify every tradie on the platform with ABN checks, licence verification, and insurance proof. No per-lead fees, no commission on jobs — tradies pay a flat monthly subscription, and homeowners never pay a cent.
        </Text>

        <Text style={[styles.body, { color: c.textSecondary }]}>
          More coming soon. In the meantime, get in touch at{' '}
          <Text
            onPress={() => Linking.openURL('mailto:hello@bldesy.com.au')}
            style={{ color: c.primary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }}
          >
            hello@bldesy.com.au
          </Text>
          .
        </Text>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    maxWidth: 640,
    alignSelf: 'center',
  },
  heading: {
    fontFamily: FontFamily.display,
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 24,
  },
  lead: {
    fontSize: 17,
    lineHeight: 26,
  },
});
