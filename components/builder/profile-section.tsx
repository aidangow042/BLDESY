/**
 * ProfileSection — ~/bldesy-web/components/builder/profile-section.tsx: the one
 * section wrapper for public profile pages. Every block — main column and
 * sidebar — renders inside this card so the page reads as a single system.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ProfileSectionProps {
  title: string;
  /** Secondary text rendered after the title (e.g. "4.9 avg from 12 reviews"). */
  meta?: string;
  /** "sm" = compact sidebar card. */
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function ProfileSection({ title, meta, size = 'md', style, children }: ProfileSectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary, fontSize: size === 'md' ? 16 : 14 }]}>
          {title}
        </Text>
        {meta ? <Text style={[styles.meta, { color: c.textSecondary }]}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: Spacing.sm,
    rowGap: 4,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
});
