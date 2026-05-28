/**
 * Home / landing tab. Mirrors `~/bldesy-web/app/page.tsx`:
 *   <HeroSection /> + <TrustStrip /> + <PopularTrades /> + <TradieCta />
 *
 * Each section lives in `components/home/`. This file is just the shell.
 */

import { ScrollView, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/layout';
import {
  HeroSection,
  PopularTrades,
  TradieCta,
  TrustStrip,
} from '@/components/home';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <AppShell background={c.canvas}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces
      >
        <HeroSection />
        <TrustStrip />
        <PopularTrades />
        <TradieCta />
        <View style={{ height: Spacing['5xl'] }} />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: Spacing['3xl'],
  },
});
