/**
 * TradieCta — ~/bldesy-web/components/home/tradie-cta.tsx: the dark-gradient
 * banner at the bottom of the homepage. The comparison cards that used to sit
 * under it now live in ComparisonStrip. Tradie CTA = primary green (never cta
 * amber), rounded-full like the web.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';

export function TradieCta() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <LinearGradient colors={['#0a0a1a', '#0f1a1a', '#0a2018']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.section}>
      <View style={styles.centre}>
        <Text accessibilityRole="header" style={styles.heading}>
          Are you a tradie?
        </Text>
        <Text style={styles.sub}>Stop bidding for jobs. Start getting chosen.</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.forTradies as Href)}
          style={({ pressed }) => [styles.btn, Shadows.lg, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.btnText}>Join BLDESY!</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: Spacing['6xl'],
    paddingHorizontal: Spacing.lg,
  },
  centre: {
    alignItems: 'center',
  },
  heading: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 36,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: 512,
    marginBottom: Spacing['3xl'],
  },
  btn: {
    height: 48,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
});
