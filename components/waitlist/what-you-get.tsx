/**
 * WhatYouGet — port of ~/bldesy-web/components/waitlist/what-you-get.tsx: the
 * three concrete promises that make joining the waitlist worth it. Themed
 * (it sits on themed surfaces — the search fallback); honest about the draw.
 */
import { StyleSheet, Text, View } from 'react-native';

import { HeroIcon, SHIELD_CHECK_PATH, SPARKLES_PATH } from '@/components/marketing/hero-icon';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FIVE_CHECKS_LIST } from '@/lib/web/verification-copy';

import { DRAW_PRIZE_FLOOR_COPY, DRAW_TILE_TITLE } from './draw-prize';

const CURRENCY_DOLLAR_PATH =
  'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z';

const ITEMS = [
  {
    title: 'Every tradie checked five ways',
    body: `${FIVE_CHECKS_LIST} — checked before they're on the platform. No randoms, no chancers.`,
    icon: SHIELD_CHECK_PATH,
  },
  {
    title: 'Free for homeowners — always',
    body: "Search, compare and connect for nothing. You're the customer, not the product.",
    icon: CURRENCY_DOLLAR_PATH,
  },
  {
    title: `First access + ${DRAW_TILE_TITLE}`,
    body: `Join now for first access the day verified tradies go live in your suburb — and answer the job question to enter the draw for ${DRAW_PRIZE_FLOOR_COPY}.`,
    icon: SPARKLES_PATH,
  },
] as const;

export function WhatYouGet() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.list} accessibilityRole="list">
      {ITEMS.map((item) => (
        <View key={item.title} style={styles.item}>
          <View style={[styles.icon, { backgroundColor: c.primary }]}>
            <HeroIcon d={item.icon} size={20} color="#ffffff" strokeWidth={1.8} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: c.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.body, { color: c.textSecondary }]}>{item.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.xl,
  },
  item: {
    flexDirection: 'row',
    gap: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
