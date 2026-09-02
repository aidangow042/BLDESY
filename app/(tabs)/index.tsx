/**
 * Home — ~/bldesy-web/app/page.tsx, LAUNCH branch:
 *   HeroSection → TrustStrip → ComparisonStrip → PopularTrades → PrelaunchRoles
 *   (the founding-tradie card sits below Popular Trades in launch mode) →
 *   TradieCta → Footer. Fires `homepage_landed` on mount (FunnelBeacon).
 */
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  ComparisonStrip,
  HeroSection,
  PopularTrades,
  PrelaunchRoles,
  TradieCta,
  TrustStrip,
} from '@/components/home';
import { AppShell, Footer } from '@/components/layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  useEffect(() => {
    trackFunnelEvent('homepage_landed', undefined, { path: '/' });
  }, []);

  return (
    <AppShell background={c.canvas}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <HeroSection />
        <TrustStrip />
        <ComparisonStrip />
        <PopularTrades />
        <PrelaunchRoles />
        <TradieCta />
        <Footer />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
});
