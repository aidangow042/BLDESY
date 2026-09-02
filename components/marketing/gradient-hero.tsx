/**
 * GradientHero — the /for-tradies + /for-homeowners hero treatment:
 * `bg-gradient-to-br from-emerald-600 via-primary to-primary-dark` with the
 * layered glow orbs and the hairline horizon at the bottom edge. The dot-grid
 * texture is omitted (no cheap equivalent in RN; it was 7% opacity decoration).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const EMERALD_600 = '#059669';

interface GradientHeroProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GradientHero({ children, style }: GradientHeroProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.clip}>
      <LinearGradient
        colors={[EMERALD_600, c.primary, c.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, style]}
      >
        {/* Layered glow orbs — depth vs a flat gradient. */}
        <View pointerEvents="none" style={[styles.orb, styles.orbTopRight]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbBottomLeft]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbCentre]} />
        <View style={styles.content}>{children}</View>
        {/* Horizon line — subtle bottom edge highlight. */}
        <View pointerEvents="none" style={styles.horizon} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['6xl'],
    paddingBottom: Spacing['6xl'] + Spacing.lg,
    position: 'relative',
  },
  content: {
    position: 'relative',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbTopRight: {
    top: -128,
    right: -128,
    width: 420,
    height: 420,
    backgroundColor: 'rgba(110, 231, 183, 0.2)',
  },
  orbBottomLeft: {
    bottom: -160,
    left: -128,
    width: 420,
    height: 420,
    backgroundColor: 'rgba(13, 155, 122, 0.4)',
  },
  orbCentre: {
    top: '33%',
    left: '25%',
    width: 280,
    height: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
