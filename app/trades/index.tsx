/**
 * /trades — ~/bldesy-web/app/trades/page.tsx: "All Trades", the 50+ category
 * browse with the TradeFilter search input, then the site footer.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppShell, Footer } from '@/components/layout';
import { TradeFilter } from '@/components/trades/trade-filter';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TradesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <AppShell showBack>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.main}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
              All Trades
            </Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>
              Browse 50+ trade categories to find the right tradie for your job
            </Text>
          </View>
          <TradeFilter />
        </View>
        <Footer />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  main: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['4xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  h1: {
    fontFamily: FontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    maxWidth: 512,
  },
});
