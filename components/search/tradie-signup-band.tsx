/**
 * Slim tradie-recruitment band — ~/bldesy-web/components/search/tradie-signup-band.tsx.
 * Sits under the "How BLDESY works" section on the search surfaces (/search
 * and the homepage search overlay). Dark search-hero green with the cta
 * conversion button; the CTA hands off to the web onboarding wizard.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { openWebOnboarding } from '@/lib/web-onboarding';

/** The search hero's flat brand-green band (search-form.tsx bg-[#17563F]). */
export const SEARCH_HERO_GREEN = '#17563F';

export function TradieSignupBand() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  function join() {
    trackFunnelEvent('tradie_signup_cta_tapped', { via: 'search_band' });
    openWebOnboarding('builder').catch(() => {});
  }

  return (
    <View accessibilityLabel="Tradie signup" style={styles.band}>
      <Text style={styles.copy}>
        Are you a tradie? Get verified free and be live before launch day.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={join}
        style={({ pressed }) => [styles.cta, { backgroundColor: pressed ? c.ctaDark : c.cta }]}
      >
        <Text style={styles.ctaText}>Join free →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: SEARCH_HERO_GREEN,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  copy: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
    textAlign: 'center',
  },
  cta: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  ctaText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
});
