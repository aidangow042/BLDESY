/**
 * Badge — pill indicator. Mirrors `~/bldesy-web/components/ui/badge.tsx`.
 */

import { StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';

import { Colors, FontFamily, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BadgeVariant = 'trade' | 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'indigo';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ variant = 'neutral', children, style, textStyle }: BadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const { bg, fg } = (() => {
    switch (variant) {
      case 'trade':
      case 'primary':
        return { bg: c.primaryBg, fg: c.primary };
      case 'indigo':
        return { bg: c.primaryBg, fg: c.indigo };
      case 'success':
        return { bg: c.successBg, fg: c.success };
      case 'warning':
        return { bg: c.warningBg, fg: c.warning };
      case 'error':
        return { bg: c.errorBg, fg: c.error };
      case 'neutral':
      default:
        return { bg: c.canvas, fg: c.textSecondary };
    }
  })();

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: fg }, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
