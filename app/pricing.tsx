/**
 * Pricing page. Mirrors `~/bldesy-web/app/pricing/pricing-page-client.tsx`.
 *
 * On native, the existing `/subscribe` screen already renders the four tradie
 * tier cards + monthly/annual toggle in the same shape as the website's
 * pricing page. We redirect here so /pricing deep links from the hamburger or
 * marketing routes land on the same tier picker used everywhere else.
 */
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PricingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  useEffect(() => {
    router.replace('/subscribe' as any);
  }, [router]);

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
