/**
 * Card — container primitive. Mirrors `~/bldesy-web/components/ui/card.tsx`.
 *
 * `rounded-2xl border border-border bg-surface shadow-sm` in web tokens.
 */

import { View, StyleSheet, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Colors, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface CardProps extends ViewProps {
  /** Vertical/horizontal padding inside the card. Default 0 — opt in. */
  padding?: number;
  /** Drop the soft shadow (e.g. when card is in a list). */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padding, flat = false, style, children, ...rest }: CardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
        !flat && Shadows.sm,
        padding !== undefined && { padding },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl, // rounded-2xl (16)
    borderWidth: 1,
    overflow: 'hidden',
  },
});
